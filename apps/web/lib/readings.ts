'use client';

/**
 * Daily Mass readings: the day's citations from @catalysis/lectionary (the
 * Lectionary for Mass, United States), with each reading's text from the app's
 * own Bible. Nothing is fetched from another site.
 */
import {
  fetchChapter, parsePassage, passageChapters, passageVerses, READING_ORDER, usccbReadingsUrl,
  type ChapterText, type ISODate, type ReadingKind, type ReadingVerse,
} from '@catalysis/api';
import { useEffect, useState } from 'react';

export interface DayReading {
  kind: ReadingKind;
  citation: string;
  /** The text, or `undefined` when the citation names a passage the app's Bible does not have. */
  verses?: ReadingVerse[];
}

export interface DayReadings {
  date: ISODate;
  readings: DayReading[];
  /** The USCCB's page for the day, with the full Lectionary text. */
  usccb: string;
}

export type ReadingsResult =
  | { status: 'ready'; day: DayReadings }
  /** The Lectionary data has no readings for this date. */
  | { status: 'none'; usccb: string }
  | { status: 'error'; usccb: string };

export const readingsHref = (date?: ISODate) => (date ? `/readings?date=${date}` : '/readings');

const cache = new Map<ISODate, DayReadings | null>();

async function readingText(citation: string): Promise<ReadingVerse[] | undefined> {
  const passage = parsePassage(citation);
  if (!passage) return undefined;
  const chapters = new Map<number, ChapterText>();
  for (const c of passageChapters(passage)) chapters.set(c, await fetchChapter({ bookId: passage.bookId, chapter: c }));
  const verses = passageVerses(passage, chapters);
  return verses.length ? verses : undefined;
}

/** The day's readings with their text; `null` when the data has no readings for the date. */
export async function loadDayReadings(date: ISODate): Promise<DayReadings | null> {
  if (cache.has(date)) return cache.get(date) ?? null;
  const { loadLectionaryDay } = await import('@catalysis/lectionary');
  const entry = await loadLectionaryDay(date);
  if (!entry) {
    cache.set(date, null);
    return null;
  }
  const readings: DayReading[] = [];
  for (const kind of READING_ORDER) {
    const citation = entry[kind];
    if (!citation) continue;
    readings.push({ kind, citation, verses: await readingText(citation) });
  }
  const day = { date, readings, usccb: usccbReadingsUrl(date) };
  cache.set(date, day);
  return day;
}

/** The day's readings, or `undefined` while they load. */
export function useDayReadings(date: ISODate): { result: ReadingsResult | undefined; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ date: ISODate; attempt: number; result: ReadingsResult } | null>(null);
  useEffect(() => {
    let live = true;
    loadDayReadings(date)
      .then((day) => live && setState({ date, attempt, result: day ? { status: 'ready', day } : { status: 'none', usccb: usccbReadingsUrl(date) } }))
      .catch(() => live && setState({ date, attempt, result: { status: 'error', usccb: usccbReadingsUrl(date) } }));
    return () => {
      live = false;
    };
  }, [date, attempt]);
  const kept = cache.get(date);
  const result =
    state && state.date === date && state.attempt === attempt
      ? state.result
      : kept
        ? { status: 'ready' as const, day: kept }
        : undefined;
  return { result, retry: () => setAttempt((n) => n + 1) };
}
