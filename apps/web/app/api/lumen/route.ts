import {
  chunkForStreaming, createProseFilter, scriptedAnswer, splitReply,
  type LumenEvent, type LumenRequest, type LumenTurn,
} from '@catalysis/api';
import { isDatabaseConfigured } from '@catalysis/db';
import { allowAttempt, clientKey, sameOrigin, sessionUserId } from '@/lib/server/auth';
import { DEMO_MAX_INPUT, demoTokens, isDemoRequest, takeDemoAnswer } from '@/lib/server/demo';
import { activeProvider } from '@/lib/server/lumen-providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** An answer streams for as long as the model writes; this is the most a host should allow it. */
export const maxDuration = 120;

const MAX_TURNS = 40;
const MAX_CHARS = 4000;
/** Questions one member (or one address, without accounts) may ask in ten minutes. */
const QUESTIONS_PER_WINDOW = 30;

type Asker = { demo: false } | { demo: true; remaining: number };

const refusal = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Every answer costs money, so only members may ask once accounts exist. A
 * visitor trying the demo account gets a few short answers a day instead.
 * Returns who is asking, or the refusal.
 */
async function admit(request: Request): Promise<Asker | Response> {
  if (!sameOrigin(request)) return refusal('That request came from another site.', 403);
  let asker = `address:${clientKey(request)}`;
  if (isDatabaseConfigured()) {
    let userId: string | null;
    try {
      userId = await sessionUserId(request);
    } catch (error) {
      console.error('[lumen] session check', error);
      return refusal('Lumen could not answer just now. Please try again.', 503);
    }
    if (!userId) {
      if (!isDemoRequest(request)) return refusal('Please log in to ask Lumen.', 401);
      // A short burst limit in memory, before the day's allowance is touched.
      if (!allowAttempt(`lumen-demo:${clientKey(request)}`, 10, 60_000)) return refusal('One moment, then ask again.', 429);
      return { demo: true, remaining: 0 };
    }
    asker = `member:${userId}`;
  }
  if (!allowAttempt(`lumen:${asker}`, QUESTIONS_PER_WINDOW)) {
    return refusal('That’s a lot of questions at once. Give Lumen a few minutes.', 429);
  }
  return { demo: false };
}

/** A demo question is sent on its own, and kept short: the earlier turns would cost more than the answer. */
function forDemo(lumen: LumenRequest): LumenRequest {
  if (lumen.mode === 'explain' && lumen.passage) {
    return { ...lumen, passage: { reference: lumen.passage.reference, text: lumen.passage.text.slice(0, DEMO_MAX_INPUT) } };
  }
  const last = lumen.messages[lumen.messages.length - 1];
  return { mode: 'chat', messages: last ? [{ role: 'user', content: last.content.slice(0, DEMO_MAX_INPUT) }] : [] };
}

/** The request body is untrusted: keep only well-formed turns, within limits. */
function parseRequest(body: unknown): LumenRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { mode, messages, passage } = body as Record<string, unknown>;

  if (mode === 'explain') {
    if (!passage || typeof passage !== 'object') return null;
    const { reference, text } = passage as Record<string, unknown>;
    if (typeof reference !== 'string' || typeof text !== 'string' || !reference.trim() || !text.trim()) return null;
    // Angle brackets are stripped so the passage cannot close the tag it is wrapped in.
    const clean = (value: string, max: number) => value.replace(/[<>]/g, '').slice(0, max).trim();
    return { mode: 'explain', messages: [], passage: { reference: clean(reference, 80), text: clean(text, MAX_CHARS) } };
  }

  if (mode !== 'chat' || !Array.isArray(messages)) return null;
  const turns: LumenTurn[] = [];
  for (const item of messages.slice(-MAX_TURNS)) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    if (content.trim()) turns.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  while (turns[0]?.role === 'assistant') turns.shift();
  if (turns.length === 0 || turns[turns.length - 1]?.role !== 'user') return null;
  return { mode: 'chat', messages: turns };
}

export async function POST(request: Request) {
  const asker = await admit(request);
  if (asker instanceof Response) return asker;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'The request was not valid JSON.' }, { status: 400 });
  }
  const asked = parseRequest(body);
  if (!asked) return Response.json({ error: 'The request was not understood.' }, { status: 400 });
  const lumen = asker.demo ? forDemo(asked) : asked;

  // The allowance is taken only for a question that will actually be put to a model.
  let remaining: number | undefined;
  if (asker.demo && activeProvider()) {
    let allowance;
    try {
      allowance = await takeDemoAnswer(request);
    } catch (error) {
      console.error('[lumen] demo allowance', error);
      return refusal('Lumen could not answer just now. Please try again.', 503);
    }
    if (!allowance.ok) return refusal(allowance.message, 429);
    remaining = allowance.remaining;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: LumenEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const provider = activeProvider();
        if (!provider) {
          const answer = scriptedAnswer(lumen);
          for (const piece of chunkForStreaming(answer.content)) {
            if (request.signal.aborted) break;
            send({ type: 'delta', text: piece });
            await new Promise((resolve) => setTimeout(resolve, 18));
          }
          send({ type: 'done', ...answer, demo: true });
          return;
        }

        const filter = createProseFilter();
        let outcome;
        try {
          outcome = await provider.stream(
            lumen,
            request.signal,
            (chunk) => {
              const text = filter.push(chunk);
              if (text) send({ type: 'delta', text });
            },
            asker.demo ? { demoTokens: demoTokens() } : undefined,
          );
        } catch (error) {
          if (request.signal.aborted) return;
          console.error(`[lumen:${provider.id}]`, error);
          send({ type: 'error', message: provider.describe(error) ?? 'Lumen could not answer just now. Please try again.' });
          return;
        }

        if (!outcome.ok) {
          send({ type: 'error', message: 'Lumen can’t help with that request. Try asking in a different way.' });
          return;
        }
        const reply = splitReply(filter.full());
        if (!reply.content) {
          send({ type: 'error', message: 'Lumen’s answer came back empty. Please try again.' });
          return;
        }
        if (asker.demo) {
          // An answer that ran into the limit ends where a sentence does, if it has one.
          const whole = outcome.cutOff ? reply.content.replace(/(?<=[.!?)”])\s+[^.!?]*$/, '') : reply.content;
          const content = outcome.cutOff && whole === reply.content ? `${reply.content.trimEnd()}…` : whole;
          send({ type: 'done', content, citations: [], followUps: [], demo: false, remaining });
          return;
        }
        send({ type: 'done', ...reply, demo: false });
      } catch (error) {
        if (request.signal.aborted) return;
        console.error('[lumen]', error);
        send({ type: 'error', message: 'Lumen could not answer just now. Please try again.' });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by the client going away
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
