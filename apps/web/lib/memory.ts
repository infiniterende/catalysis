'use client';

import { cleanVerseText, fetchChapter, MAX_MEMORY_SPAN, type ChapterText } from '@catalysis/api';

/**
 * The words of a passage as a member learns it: the verses run together,
 * without a psalm's title or "Selah". Throws if the chapter cannot be read.
 */
export function passageText(chapter: ChapterText, verseStart: number, verseEnd: number): string {
  return chapter.verses
    .filter((v) => v.number >= verseStart && v.number <= verseEnd)
    .map((v) => cleanVerseText(chapter.ref.bookId, v.number, v.text))
    .filter(Boolean)
    .join(' ');
}

export async function loadPassageText(bookId: string, chapter: number, verseStart: number, verseEnd: number): Promise<string> {
  return passageText(await fetchChapter({ bookId, chapter }), verseStart, verseEnd);
}

/** The run of verses a selection covers: from the first picked to the last. */
export function selectionSpan(numbers: number[]): { verseStart: number; verseEnd: number; tooLong: boolean } | undefined {
  if (numbers.length === 0) return undefined;
  const verseStart = Math.min(...numbers);
  const verseEnd = Math.max(...numbers);
  return { verseStart, verseEnd, tooLong: verseEnd - verseStart + 1 > MAX_MEMORY_SPAN };
}
