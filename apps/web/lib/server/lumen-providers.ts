/**
 * The models Lumen can run on: Gemini on Vertex AI (the default), or Claude if
 * an Anthropic key is set and LUMEN_PROVIDER=anthropic. Each provider streams
 * the reply's text to `onText` and resolves when the reply is complete; the
 * route turns that text into the wire format. Server-side only.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { LumenRequest } from '@catalysis/api';
import { FinishReason, ThinkingLevel } from '@google/genai';
import { buildMessages, LUMEN_DEMO_SYSTEM, LUMEN_SYSTEM } from './lumen-prompt';
import { isCredentialsError, vertex, vertexConfigured, vertexStatus } from './vertex';

export type ProviderId = 'vertex' | 'anthropic';

export type ProviderOutcome = { ok: true; cutOff?: boolean } | { ok: false; reason: 'refused' };

export interface StreamOptions {
  /** Set for a visitor trying the demo: a short answer of at most this many tokens. */
  demoTokens?: number;
}

interface Provider {
  id: ProviderId;
  configured(): boolean;
  stream(request: LumenRequest, signal: AbortSignal, onText: (text: string) => void, options?: StreamOptions): Promise<ProviderOutcome>;
  /** A message fit to show the reader, for an error this provider threw. */
  describe(error: unknown): string | undefined;
}

const BUSY = 'Lumen is busy just now. Please try again in a moment.';
const MISCONFIGURED = 'Lumen is not configured correctly. Please let us know.';
const UNREACHABLE = 'Lumen could not be reached. Check your connection and try again.';
const UNAVAILABLE = 'Lumen is unavailable just now. Please try again in a moment.';

const anthropic: Provider = {
  id: 'anthropic',
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),

  async stream(request, signal, onText, options) {
    const client = new Anthropic();
    const demo = options?.demoTokens;
    const run = client.beta.messages.stream(
      {
        model: process.env.LUMEN_MODEL || 'claude-opus-5',
        max_tokens: demo ?? (request.mode === 'explain' ? 2000 : 8000),
        // A chat reply is short; medium effort keeps the wait brief without losing care over sources.
        output_config: { effort: demo || request.mode === 'explain' ? 'low' : 'medium' },
        system: [{ type: 'text', text: demo ? LUMEN_DEMO_SYSTEM : LUMEN_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: buildMessages(request),
        // If the safety classifiers decline a request, retry it on Anthropic's recommended fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal },
    );
    for await (const event of run) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text);
    }
    const final = await run.finalMessage();
    if (final.stop_reason === 'refusal') return { ok: false, reason: 'refused' };
    return { ok: true, cutOff: final.stop_reason === 'max_tokens' };
  },

  describe(error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return MISCONFIGURED;
    if (error instanceof Anthropic.RateLimitError) return BUSY;
    if (error instanceof Anthropic.APIConnectionError) return UNREACHABLE;
    if (error instanceof Anthropic.APIError && typeof error.status === 'number' && error.status >= 500) return UNAVAILABLE;
    return undefined;
  },
};

/** Reasons Gemini stops that mean it would not answer, rather than that it ran out of room. */
const BLOCKED = new Set<string>([
  FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.BLOCKLIST, FinishReason.SPII, FinishReason.RECITATION,
]);

const gemini: Provider = {
  id: 'vertex',
  configured: vertexConfigured,

  async stream(request, signal, onText, options) {
    const demo = options?.demoTokens;
    const run = await vertex().models.generateContentStream({
      model: process.env.LUMEN_GEMINI_MODEL || 'gemini-3.8-flash',
      contents: buildMessages(request).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: {
        systemInstruction: demo ? LUMEN_DEMO_SYSTEM : LUMEN_SYSTEM,
        // The limit covers the model's thinking as well as its answer, so a demo answer does no thinking.
        maxOutputTokens: demo ?? (request.mode === 'explain' ? 2000 : 8000),
        thinkingConfig: demo ? { thinkingBudget: 0 } : { thinkingLevel: request.mode === 'explain' ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM },
        abortSignal: signal,
      },
    });
    let refused = false;
    let cutOff = false;
    for await (const chunk of run) {
      if (chunk.promptFeedback?.blockReason) refused = true;
      const text = chunk.text;
      if (text) onText(text);
      const reason = chunk.candidates?.[0]?.finishReason;
      if (reason === FinishReason.MAX_TOKENS) cutOff = true;
      else if (reason && BLOCKED.has(reason)) refused = true;
    }
    return refused ? { ok: false, reason: 'refused' } : { ok: true, cutOff };
  },

  describe(error) {
    if (isCredentialsError(error)) return MISCONFIGURED;
    const status = vertexStatus(error);
    if (status === 401 || status === 403 || status === 404) return MISCONFIGURED;
    if (status === 429) return BUSY;
    if (status !== undefined && status >= 500) return UNAVAILABLE;
    if (error instanceof TypeError && /fetch failed/i.test(error.message)) return UNREACHABLE;
    return undefined;
  },
};

const PROVIDERS: Record<ProviderId, Provider> = { vertex: gemini, anthropic };

/**
 * The provider to use: `LUMEN_PROVIDER` when set and configured, otherwise the
 * first one that has credentials. `undefined` means Lumen runs on its scripted
 * demo answers.
 */
export function activeProvider(): Provider | undefined {
  const wanted = process.env.LUMEN_PROVIDER?.toLowerCase();
  if (wanted === 'vertex' || wanted === 'anthropic') {
    return PROVIDERS[wanted].configured() ? PROVIDERS[wanted] : undefined;
  }
  return [gemini, anthropic].find((provider) => provider.configured());
}
