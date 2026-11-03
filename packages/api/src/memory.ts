/**
 * Scripture memory: verses a member is learning by heart.
 *
 * A passage is first learned in a few short steps (read it, fill in the gaps,
 * recite from first letters, then from memory). After that it comes back for
 * review on a widening schedule: a day, three days, a week, two weeks and so
 * on, and back to the start when it has slipped. This is the Leitner method,
 * kept simple so a member can see why a verse is due.
 */
import { getBook, verseLabel } from './bible/books.ts';
import { addDays, parseISODate, toISODate } from './format.ts';
import type { ISODate, ISODateTime } from './types.ts';

export interface MemoryVerse {
  id: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  /** The passage as it was saved, so practice never waits on the Bible loading. */
  text: string;
  /** 0 while the passage is being learned; from 1 up, the review box. */
  box: number;
  /** The day the next review falls due. */
  dueOn: ISODate;
  reviews: number;
  /** Times the passage slipped and went back to the first box. */
  lapses: number;
  lastReviewedOn?: ISODate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type MemoryGrade = 'again' | 'hard' | 'good' | 'easy';

/** Days until the next review, by box. Box 0 is still being learned. */
export const MEMORY_INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120] as const;
export const MAX_BOX = MEMORY_INTERVALS.length - 1;
/** From this box on, a passage counts as known by heart: it has held for two weeks. */
export const KNOWN_BOX = 4;
export const MAX_MEMORY_VERSES = 500;
/** The longest passage that can be saved, in verses and in characters. */
export const MAX_MEMORY_SPAN = 12;
export const MAX_MEMORY_TEXT = 2400;

const interval = (box: number) => MEMORY_INTERVALS[Math.max(0, Math.min(MAX_BOX, box))] ?? 0;

export function memoryLabel(v: Pick<MemoryVerse, 'bookId' | 'chapter' | 'verseStart' | 'verseEnd'>): string {
  return verseLabel(v.bookId, v.chapter, v.verseStart, v.verseEnd);
}

/** Where the passage is in the Bible reader. */
export function memoryHref(v: Pick<MemoryVerse, 'bookId' | 'chapter' | 'verseStart'>): string {
  return `/scripture/${v.bookId}/${v.chapter}?verse=${v.verseStart}`;
}

export function newMemoryVerse(
  input: Pick<MemoryVerse, 'id' | 'bookId' | 'chapter' | 'verseStart' | 'verseEnd' | 'text'>,
  now: Date,
): MemoryVerse {
  const stamp = now.toISOString();
  return {
    ...input,
    text: input.text.replace(/\s+/g, ' ').trim(),
    box: 0,
    dueOn: toISODate(now),
    reviews: 0,
    lapses: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** The passage after a review (or after it is first learned, from box 0). */
export function reviewMemory(verse: MemoryVerse, grade: MemoryGrade, now: Date): MemoryVerse {
  const today = parseISODate(toISODate(now));
  let box = verse.box;
  let lapses = verse.lapses;
  let days: number;
  switch (grade) {
    case 'again':
      // Still learning: try again today. Once learned: back to the first box.
      if (box > 0) lapses += 1;
      box = box > 0 ? 1 : 0;
      days = box > 0 ? 1 : 0;
      break;
    case 'hard':
      box = Math.max(1, box);
      days = Math.max(1, Math.round(interval(box) / 2));
      break;
    case 'good':
      box = Math.min(MAX_BOX, box + 1);
      days = interval(box);
      break;
    case 'easy':
      box = Math.min(MAX_BOX, box + 2);
      days = interval(box);
      break;
  }
  return {
    ...verse,
    box,
    lapses,
    dueOn: toISODate(addDays(today, days)),
    reviews: verse.reviews + 1,
    lastReviewedOn: toISODate(today),
    updatedAt: now.toISOString(),
  };
}

/** Learned passages due for review today or earlier, the longest waiting first. */
export function dueMemory(verses: MemoryVerse[], today: ISODate): MemoryVerse[] {
  return verses
    .filter((v) => v.box > 0 && v.dueOn <= today)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.box - b.box || a.createdAt.localeCompare(b.createdAt));
}

/** Passages saved but not yet learned, the oldest first. */
export function learningMemory(verses: MemoryVerse[]): MemoryVerse[] {
  return verses.filter((v) => v.box === 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function knownMemory(verses: MemoryVerse[]): MemoryVerse[] {
  return verses.filter((v) => v.box >= KNOWN_BOX);
}

/** The next day anything comes due, if nothing is due today. */
export function nextMemoryReview(verses: MemoryVerse[], today: ISODate): ISODate | undefined {
  return verses
    .filter((v) => v.box > 0 && v.dueOn > today)
    .map((v) => v.dueOn)
    .sort()[0];
}

/** Where a passage stands, in words: `Learning`, `Due today`, `Next in 3 days`. */
export function memoryStatus(v: MemoryVerse, today: ISODate): string {
  if (v.box === 0) return 'Learning';
  if (v.dueOn <= today) return 'Due today';
  const days = Math.round((parseISODate(v.dueOn).getTime() - parseISODate(today).getTime()) / 86_400_000);
  return days === 1 ? 'Next tomorrow' : `Next in ${days} days`;
}

/* ---------- the words of a passage ---------- */

export interface MemoryToken {
  /** Punctuation before the word, such as an opening quotation mark. */
  lead: string;
  /** The word itself; empty for a token that is only punctuation, like a dash. */
  word: string;
  /** Punctuation after the word. */
  tail: string;
}

const WORD = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su;

export function memoryTokens(text: string): MemoryToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => {
      const [, lead = '', word = '', tail = ''] = WORD.exec(chunk) ?? [];
      return word ? { lead, word, tail } : { lead: chunk, word: '', tail: '' };
    });
}

/** A word as it is compared: lower case, without accents or punctuation. */
export function normalWord(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** A small, repeatable hash, so a round hides the same words each time it is drawn. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Which words to hide for a fill-in-the-gaps round: about `share` of them,
 * picked afresh for each `round`. Short words such as "a" are hidden only once
 * most of the passage is.
 */
export function hiddenWords(text: string, share: number, round = 0): Set<number> {
  const tokens = memoryTokens(text);
  const candidates = tokens
    .map((t, i) => ({ i, t }))
    .filter(({ t }) => t.word && (share >= 0.6 || normalWord(t.word).length > 2));
  const target = Math.max(1, Math.round(candidates.length * share));
  const ranked = candidates
    .map(({ i, t }) => ({ i, rank: hash(`${round}:${i}:${t.word}`) }))
    .sort((a, b) => a.rank - b.rank);
  return new Set(ranked.slice(0, target).map((r) => r.i));
}

/** `In the beginning was the Word` → `I t b w t W`. */
export function firstLetters(text: string): string {
  return memoryTokens(text)
    .map((t) => `${t.lead}${t.word ? (t.word.match(/^[\p{L}\p{N}]/u)?.[0] ?? t.word) : ''}${t.tail}`)
    .join(' ');
}

export interface Recitation {
  /** Share of the passage's words recited, from 0 to 1. */
  score: number;
  /** Each word of the passage, and whether it was recited in its place. */
  words: (MemoryToken & { ok: boolean })[];
  /** Words typed that are not in the passage. */
  extra: number;
}

/**
 * Compares what a member typed with the passage, word by word, ignoring case,
 * punctuation and accents. Words are matched in order (the longest common
 * subsequence), so one missed word does not count the rest as wrong.
 */
export function checkRecitation(text: string, typed: string): Recitation {
  const tokens = memoryTokens(text);
  const expected = tokens.map((t) => normalWord(t.word));
  const said = memoryTokens(typed).map((t) => normalWord(t.word)).filter(Boolean);
  const n = expected.length;
  const m = said.length;
  // lcs[i][j]: the longest match of expected[i..] with said[j..].
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = lcs[i] as number[];
      row[j] = expected[i] && expected[i] === said[j]
        ? (lcs[i + 1]?.[j + 1] ?? 0) + 1
        : Math.max(lcs[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  const ok = new Array<boolean>(n).fill(false);
  let matched = 0;
  for (let i = 0, j = 0; i < n && j < m;) {
    if (expected[i] && expected[i] === said[j]) {
      ok[i] = true;
      matched += 1;
      i += 1;
      j += 1;
    } else if ((lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) i += 1;
    else j += 1;
  }
  const words = tokens.map((t, i) => ({ ...t, ok: !t.word || (ok[i] ?? false) }));
  const total = expected.filter(Boolean).length;
  return { score: total === 0 ? 1 : matched / total, words, extra: m - matched };
}

/** The grade a recitation suggests; the member can choose another. */
export function suggestedGrade(score: number): MemoryGrade {
  if (score >= 0.98) return 'good';
  if (score >= 0.8) return 'hard';
  return 'again';
}

/* ---------- where to begin ---------- */

export interface SuggestedPassage {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  /** Why a member might choose it. */
  theme: string;
}

/** Well-loved passages to start with, in the NABRE's numbering. */
export const SUGGESTED_PASSAGES: SuggestedPassage[] = [
  { bookId: 'JHN', chapter: 3, verseStart: 16, verseEnd: 16, theme: 'God’s love' },
  { bookId: 'PSA', chapter: 23, verseStart: 1, verseEnd: 3, theme: 'Trust' },
  { bookId: 'PRO', chapter: 3, verseStart: 5, verseEnd: 6, theme: 'Guidance' },
  { bookId: 'PHP', chapter: 4, verseStart: 6, verseEnd: 7, theme: 'Anxiety' },
  { bookId: 'MAT', chapter: 11, verseStart: 28, verseEnd: 30, theme: 'Rest' },
  { bookId: 'ROM', chapter: 8, verseStart: 28, verseEnd: 28, theme: 'Hope' },
  { bookId: 'ISA', chapter: 40, verseStart: 31, verseEnd: 31, theme: 'Strength' },
  { bookId: 'LUK', chapter: 1, verseStart: 38, verseEnd: 38, theme: 'Mary’s yes' },
  { bookId: 'MIC', chapter: 6, verseStart: 8, verseEnd: 8, theme: 'What God asks' },
  { bookId: 'JHN', chapter: 14, verseStart: 6, verseEnd: 6, theme: 'The Way' },
  { bookId: '1CO', chapter: 13, verseStart: 4, verseEnd: 7, theme: 'Love' },
  { bookId: 'JOS', chapter: 1, verseStart: 9, verseEnd: 9, theme: 'Courage' },
].filter((p) => getBook(p.bookId) !== undefined);
