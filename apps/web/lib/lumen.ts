'use client';

import { streamLumen, type Citation, type LumenRequest } from '@catalysis/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isGuest } from './store';

export const LUMEN_ENDPOINT = '/api/lumen';

/** Marks a question from a visitor trying the demo, who gets a few short answers a day. */
export const lumenHeaders = (): Record<string, string> | undefined => (isGuest() ? { 'x-catalysis-demo': '1' } : undefined);

export interface Explanation {
  content: string;
  citations: Citation[];
  demo: boolean;
}

type ExplainState =
  | { status: 'idle' }
  | { status: 'streaming'; content: string }
  | { status: 'done'; result: Explanation }
  | { status: 'error'; message: string };

/** Streams a short explanation of one passage. Results are kept per reference for the session. */
export function useExplain(initial?: Record<string, Explanation>) {
  const cache = useRef<Record<string, Explanation>>({ ...initial });
  const abort = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ reference: string } & ExplainState>({ reference: '', status: 'idle' });

  useEffect(() => () => abort.current?.abort(), []);

  const show = useCallback((reference: string) => {
    abort.current?.abort();
    const hit = cache.current[reference];
    setState(hit ? { reference, status: 'done', result: hit } : { reference, status: 'idle' });
  }, []);

  const explain = useCallback(async (passage: NonNullable<LumenRequest['passage']>) => {
    abort.current?.abort();
    const hit = cache.current[passage.reference];
    if (hit) {
      setState({ reference: passage.reference, status: 'done', result: hit });
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    let content = '';
    setState({ reference: passage.reference, status: 'streaming', content });
    try {
      const result = await streamLumen(
        { mode: 'explain', messages: [], passage },
        {
          endpoint: LUMEN_ENDPOINT,
          headers: lumenHeaders(),
          signal: controller.signal,
          onDelta: (text) => {
            content += text;
            setState({ reference: passage.reference, status: 'streaming', content });
          },
        },
      );
      if (controller.signal.aborted) return;
      const explanation = { content: result.content, citations: result.citations, demo: result.demo };
      cache.current[passage.reference] = explanation;
      setState({ reference: passage.reference, status: 'done', result: explanation });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ reference: passage.reference, status: 'error', message: (error as Error).message });
    }
  }, []);

  return { state, explain, show };
}
