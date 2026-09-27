/**
 * The models Lumen can run on. Each provider streams the reply's text to
 * `onText` and resolves when the reply is complete; the route turns that text
 * into the wire format. Server-side only: keys never reach the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { LumenRequest } from '@catalysis/api';
import OpenAI from 'openai';
import { buildMessages, LUMEN_DEMO_SYSTEM, LUMEN_SYSTEM } from './lumen-prompt';

export type ProviderId = 'anthropic' | 'openai';

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

const openai: Provider = {
  id: 'openai',
  configured: () => Boolean(process.env.OPENAI_API_KEY),

  async stream(request, signal, onText, options) {
    const client = new OpenAI();
    const demo = options?.demoTokens;
    const run = await client.chat.completions.create(
      {
        model: process.env.LUMEN_OPENAI_MODEL || 'gpt-5.5',
        stream: true,
        // The limit covers the model's reasoning as well as its answer, so a demo answer does no reasoning.
        max_completion_tokens: demo ?? (request.mode === 'explain' ? 2000 : 8000),
        reasoning_effort: demo ? 'none' : request.mode === 'explain' ? 'low' : 'medium',
        messages: [{ role: 'developer', content: demo ? LUMEN_DEMO_SYSTEM : LUMEN_SYSTEM }, ...buildMessages(request)],
      },
      { signal },
    );
    let refused = false;
    let cutOff = false;
    for await (const chunk of run) {
      const choice = chunk.choices[0];
      if (choice?.delta?.refusal) refused = true;
      if (choice?.delta?.content) onText(choice.delta.content);
      if (choice?.finish_reason === 'length') cutOff = true;
    }
    return refused ? { ok: false, reason: 'refused' } : { ok: true, cutOff };
  },

  describe(error) {
    if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) return MISCONFIGURED;
    if (error instanceof OpenAI.RateLimitError) return BUSY;
    if (error instanceof OpenAI.APIConnectionError) return UNREACHABLE;
    if (error instanceof OpenAI.APIError && typeof error.status === 'number' && error.status >= 500) return UNAVAILABLE;
    return undefined;
  },
};

const PROVIDERS: Record<ProviderId, Provider> = { anthropic, openai };

/**
 * The provider to use: `LUMEN_PROVIDER` when set and configured, otherwise the
 * first one that has credentials. `undefined` means Lumen runs on its scripted
 * demo answers.
 */
export function activeProvider(): Provider | undefined {
  const wanted = process.env.LUMEN_PROVIDER?.toLowerCase();
  if (wanted === 'anthropic' || wanted === 'openai') {
    return PROVIDERS[wanted].configured() ? PROVIDERS[wanted] : undefined;
  }
  return [anthropic, openai].find((provider) => provider.configured());
}
