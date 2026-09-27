import { chunkForStreaming, scriptedAnswer } from './demo.ts';
import type { LumenEvent, LumenRequest } from './protocol.ts';

export interface LumenStreamOptions {
  /** Full URL of the Lumen route, e.g. `https://app.example/api/lumen`. Omit to use the offline demo. */
  endpoint?: string;
  /** Streaming-capable fetch. React Native must pass `fetch` from `expo/fetch`. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Extra request headers, such as the one that marks a visitor trying the demo. */
  headers?: Record<string, string>;
  onDelta: (text: string) => void;
}

export type LumenResult = Extract<LumenEvent, { type: 'done' }>;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Plays a scripted answer with the same cadence as a streamed one. */
export async function streamDemo(request: LumenRequest, options: Pick<LumenStreamOptions, 'onDelta' | 'signal'>): Promise<LumenResult> {
  const answer = scriptedAnswer(request);
  for (const piece of chunkForStreaming(answer.content)) {
    if (options.signal?.aborted) break;
    options.onDelta(piece);
    await sleep(18);
  }
  return { type: 'done', content: answer.content, citations: answer.citations, followUps: answer.followUps, demo: true };
}

/**
 * Streams an answer from the Lumen route. If the route cannot be reached at all
 * the offline demo answers instead, so the screen never dead-ends; an error
 * reported by the route itself is thrown.
 */
export async function streamLumen(request: LumenRequest, options: LumenStreamOptions): Promise<LumenResult> {
  if (!options.endpoint) return streamDemo(request, options);
  const doFetch = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(options.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(request),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    return streamDemo(request, options);
  }
  if (!response.ok || !response.body) {
    let message = 'Lumen could not answer just now. Please try again.';
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let result: LumenResult | undefined;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as LumenEvent;
    if (event.type === 'delta') options.onDelta(event.text);
    else if (event.type === 'done') result = event;
    else if (event.type === 'error') throw new Error(event.message);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    let newline = pending.indexOf('\n');
    while (newline >= 0) {
      handle(pending.slice(0, newline));
      pending = pending.slice(newline + 1);
      newline = pending.indexOf('\n');
    }
  }
  handle(pending + decoder.decode());

  if (!result) throw new Error('Lumen’s answer was cut short. Please try again.');
  return result;
}
