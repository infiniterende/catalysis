'use client';

/** Loads the Liturgy of the Hours from the app's server, which keeps the copy it fetched from iBreviary. */
import type { HourId, HourText, ISODate } from '@catalysis/api';
import { useEffect, useState } from 'react';

export type HourResult =
  | { status: 'ready'; text: HourText }
  | { status: 'error'; message: string; link?: string };

const cache = new Map<string, HourText>();

export const hoursHref = (hour?: HourId, date?: ISODate) => {
  const query = new URLSearchParams();
  if (date) query.set('date', date);
  if (hour) query.set('hour', hour);
  const qs = query.toString();
  return qs ? `/prayer/hours?${qs}` : '/prayer/hours';
};

async function load(date: ISODate, hour: HourId, signal: AbortSignal): Promise<HourResult> {
  const key = `${date}/${hour}`;
  const kept = cache.get(key);
  if (kept) return { status: 'ready', text: kept };
  try {
    const response = await fetch(`/api/hours?date=${date}&hour=${hour}`, { signal });
    const data = (await response.json()) as HourText & { error?: string; link?: string };
    if (!response.ok || data.error) return { status: 'error', message: data.error ?? 'The hour could not be loaded.', link: data.link };
    cache.set(key, data);
    return { status: 'ready', text: data };
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    return { status: 'error', message: 'We couldn’t reach Catalysis. Check your connection and try again.' };
  }
}

/** The hour's text, or `undefined` while it loads. `retry` asks again after an error. */
export function useHour(date: ISODate, hour: HourId): { result: HourResult | undefined; retry: () => void } {
  const key = `${date}/${hour}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; attempt: number; value: HourResult } | null>(() => {
    const kept = cache.get(key);
    return kept ? { key, attempt: 0, value: { status: 'ready', text: kept } } : null;
  });

  useEffect(() => {
    const controller = new AbortController();
    load(date, hour, controller.signal)
      .then((value) => setResult({ key, attempt, value }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [date, hour, key, attempt]);

  const current = result && result.key === key && result.attempt === attempt ? result.value : cache.has(key) ? { status: 'ready' as const, text: cache.get(key)! } : undefined;
  return { result: current, retry: () => setAttempt((n) => n + 1) };
}
