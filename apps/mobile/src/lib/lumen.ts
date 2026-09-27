import { streamLumen, type LumenRequest, type LumenResult } from '@catalysis/api';
import { fetch as streamingFetch } from 'expo/fetch';

const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

/** Undefined when no server is configured; Lumen then plays its built-in demo answers. */
export const LUMEN_ENDPOINT = base ? `${base}/api/lumen` : undefined;

interface AskOptions {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * Streams an answer from Lumen. React Native's global `fetch` buffers the whole
 * response, so the request goes through `expo/fetch`, which exposes the body as a stream.
 */
export function askLumen(request: LumenRequest, { onDelta, signal }: AskOptions): Promise<LumenResult> {
  return streamLumen(request, {
    endpoint: LUMEN_ENDPOINT,
    fetchImpl: streamingFetch as unknown as typeof fetch,
    onDelta,
    signal,
  });
}

export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function errorMessage(error: unknown, fallback = 'Lumen could not answer just now. Please try again.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Collects streamed text and hands it on at most `perSecond` times a second,
 * so a fast stream does not re-render the thread for every token.
 */
export function createThrottle(emit: (text: string) => void, perSecond = 10) {
  let text = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    push(delta: string) {
      text += delta;
      timer ??= setTimeout(() => {
        timer = undefined;
        emit(text);
      }, 1000 / perSecond);
    },
    /** Stops any pending emit. Call when the stream ends or is abandoned. */
    cancel() {
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}
