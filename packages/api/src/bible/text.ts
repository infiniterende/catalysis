/**
 * Bible text.
 *
 * The reader's text comes from whichever source the app registers with
 * `setBibleSource` — today the NABRE, bundled in `@catalysis/bible-nabre`. To
 * change translation, register a different loader; nothing else needs to move.
 *
 * With no source registered the reader falls back to the design's RSV-CE
 * excerpt (John 1:1–5) and, for everything else, the public-domain
 * Douay-Rheims from bible-api.com.
 */
import { getBook, type ChapterRef } from './books.ts';

export interface VerseBreak {
  /** Character offset into the verse text where the headings fall. */
  at: number;
  headings: string[];
}

export interface Verse {
  number: number;
  text: string;
  /** Section headings that stand before the verse. */
  headings?: string[];
  /** Section headings that fall inside the verse. */
  breaks?: VerseBreak[];
}

export type EditionId = 'nabre' | 'rsv-ce' | 'dra';

export interface Edition {
  id: EditionId;
  /** `RSV-CE` */
  short: string;
  /** `Revised Standard Version, Catholic Ed.` */
  name: string;
  /** `Revised Standard Version · Catholic Edition` */
  nameLong: string;
}

export const EDITIONS: Record<EditionId, Edition> = {
  nabre: {
    id: 'nabre',
    short: 'NABRE',
    name: 'New American Bible, Revised Ed.',
    nameLong: 'New American Bible · Revised Edition',
  },
  'rsv-ce': {
    id: 'rsv-ce',
    short: 'RSV-CE',
    name: 'Revised Standard Version, Catholic Ed.',
    nameLong: 'Revised Standard Version · Catholic Edition',
  },
  dra: {
    id: 'dra',
    short: 'Douay-Rheims',
    name: 'Douay-Rheims, 1899 American Ed.',
    nameLong: 'Douay-Rheims · 1899 American Edition',
  },
};

export interface ChapterText {
  ref: ChapterRef;
  edition: Edition;
  /** Section title, where one is known. */
  title?: string;
  verses: Verse[];
  /** True when only part of the chapter is available in this edition. */
  excerpt?: boolean;
}

/** John 1:1–5, RSV-CE — the design's sample passage. */
export const SAMPLE_CHAPTER: ChapterText = {
  ref: { bookId: 'JHN', chapter: 1 },
  edition: EDITIONS['rsv-ce'],
  title: 'The Word Became Flesh',
  excerpt: true,
  verses: [
    { number: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
    { number: 2, text: 'He was in the beginning with God;' },
    { number: 3, text: 'all things were made through him, and without him was not anything made that was made.' },
    { number: 4, text: 'In him was life, and the life was the light of men.' },
    { number: 5, text: 'The light shines in the darkness, and the darkness has not overcome it.' },
  ],
};

export const VERSE_OF_THE_DAY = {
  bookId: 'JHN',
  chapter: 1,
  verse: 5,
  text: 'The light shines in the darkness, and the darkness has not overcome it.',
  label: 'John 1:5',
} as const;

/** `NABRE` once a text source is registered, otherwise the excerpt's `RSV-CE`. */
export function defaultEditionShort(): string {
  return (source ? EDITIONS[source.edition] : EDITIONS['rsv-ce']).short;
}

/** A book as stored by a text source: `chapters[0]` is chapter 1. */
export interface SourceBook {
  chapters: { n: number; t: string; h?: string[]; m?: { at: number; h: string[] }[] }[][];
}

export type BookLoader = (bookId: string) => Promise<SourceBook | undefined>;

let source: { load: BookLoader; edition: EditionId } | undefined;

/** Registers where the reader's text comes from. Call once, at app start. */
export function setBibleSource(load: BookLoader, edition: EditionId = 'nabre'): void {
  source = { load, edition };
  cache.clear();
}

/** Drops a leading division numeral: `I. Prologue` → `Prologue`. */
const withoutNumeral = (heading: string) => heading.replace(/^[IVXLC]+\.\s+/, '');

async function fetchFromSource(ref: ChapterRef, bookName: string): Promise<ChapterText> {
  if (!source) throw new BibleTextError('unavailable', 'No text source is set up.');
  let book: SourceBook | undefined;
  try {
    book = await source.load(ref.bookId);
  } catch {
    throw new BibleTextError('network', 'The text could not be loaded just now. Try again in a moment.');
  }
  const verses = book?.chapters[ref.chapter - 1];
  if (!verses || verses.length === 0) {
    throw new BibleTextError('unavailable', `${bookName} ${ref.chapter} is not available in this edition.`);
  }
  // The last heading over verse 1 names the chapter; any before it stay with the verse.
  const opening = verses[0]?.h ?? [];
  const title = opening.length > 0 ? withoutNumeral(opening[opening.length - 1] ?? '') : undefined;
  return {
    ref: { bookId: ref.bookId, chapter: ref.chapter },
    edition: EDITIONS[source.edition],
    title: title || undefined,
    verses: verses.map((v, i) => {
      const headings = i === 0 ? opening.slice(0, -1) : v.h;
      return {
        number: v.n,
        text: v.t,
        headings: headings && headings.length > 0 ? headings : undefined,
        breaks: v.m?.map((b) => ({ at: b.at, headings: b.h })),
      };
    }),
  };
}

export class BibleTextError extends Error {
  readonly reason: 'unavailable' | 'network';
  constructor(reason: 'unavailable' | 'network', message: string) {
    super(message);
    this.name = 'BibleTextError';
    this.reason = reason;
  }
}

const SOURCE = 'https://bible-api.com/data/dra';
const cache = new Map<string, ChapterText>();

function isSample(ref: ChapterRef): boolean {
  return ref.bookId === SAMPLE_CHAPTER.ref.bookId && ref.chapter === SAMPLE_CHAPTER.ref.chapter;
}

/**
 * Loads a chapter from the registered source. `edition` asks for a specific
 * text instead: `rsv-ce` resolves only for the design's excerpt, `dra` reads
 * the Douay-Rheims over the network.
 */
export async function fetchChapter(
  ref: ChapterRef,
  options: { edition?: EditionId; signal?: AbortSignal } = {},
): Promise<ChapterText> {
  const book = getBook(ref.bookId);
  if (!book || ref.chapter < 1 || ref.chapter > book.chapters) {
    throw new BibleTextError('unavailable', 'That chapter does not exist.');
  }
  const wanted = options.edition ?? source?.edition;
  if (source && wanted === source.edition) {
    const key = `${source.edition}/${book.id}/${ref.chapter}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const chapter = await fetchFromSource({ bookId: book.id, chapter: ref.chapter }, book.name);
    cache.set(key, chapter);
    return chapter;
  }
  if (wanted !== 'dra' && isSample(ref)) return SAMPLE_CHAPTER;
  if (wanted === 'rsv-ce' || wanted === 'nabre') {
    throw new BibleTextError('unavailable', 'This edition is not available for this chapter.');
  }
  if (book.deuterocanonical) {
    throw new BibleTextError('unavailable', `${book.name} is not yet available. It will appear with the licensed text.`);
  }

  const key = `dra/${book.id}/${ref.chapter}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let response: Response;
  try {
    response = await fetch(`${SOURCE}/${book.id}/${ref.chapter}`, { signal: options.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new BibleTextError('network', 'Could not reach the text. Check your connection and try again.');
  }
  if (response.status === 404) {
    throw new BibleTextError('unavailable', 'This chapter is not yet available. It will appear with the licensed text.');
  }
  if (!response.ok) {
    throw new BibleTextError('network', 'The text could not be loaded just now. Try again in a moment.');
  }

  const data = (await response.json()) as { verses?: { verse: number; text: string }[] };
  const verses = (data.verses ?? []).map((v) => ({ number: v.verse, text: v.text.replace(/\s+/g, ' ').trim() }));
  if (verses.length === 0) {
    throw new BibleTextError('unavailable', 'This chapter is not yet available. It will appear with the licensed text.');
  }
  const chapter: ChapterText = { ref: { bookId: book.id, chapter: ref.chapter }, edition: EDITIONS.dra, verses };
  cache.set(key, chapter);
  return chapter;
}

export interface VerseSegment {
  text: string;
  highlighted: boolean;
  /** Highlighter colour, when the highlight names one. */
  color?: string;
}

export type VerseMark = string | undefined | { text?: string; color?: string };

/**
 * Splits a verse into plain and highlighted runs. A mark without a phrase (or
 * whose phrase is no longer found) covers the whole verse. Later marks win
 * where two overlap.
 */
export function segmentVerse(text: string, marks: VerseMark[]): VerseSegment[] {
  if (marks.length === 0) return [{ text, highlighted: false }];
  // 0 is unmarked; n is the (n-1)th mark.
  const owner = new Array<number>(text.length).fill(0);
  marks.forEach((mark, index) => {
    const phrase = typeof mark === 'object' ? mark.text : mark;
    const at = phrase ? text.indexOf(phrase) : -1;
    const start = at >= 0 ? at : 0;
    const end = at >= 0 && phrase ? at + phrase.length : text.length;
    for (let i = start; i < end; i++) owner[i] = index + 1;
  });
  const colorOf = (n: number) => {
    const mark = marks[n - 1];
    return typeof mark === 'object' ? mark.color : undefined;
  };
  const segments: (VerseSegment & { owner: number })[] = [];
  for (let i = 0; i < text.length; i++) {
    const n = owner[i] ?? 0;
    const last = segments[segments.length - 1];
    if (last && last.owner === n) last.text += text[i];
    else segments.push({ text: text[i] ?? '', highlighted: n > 0, color: colorOf(n), owner: n });
  }
  return segments.map(({ owner: _owner, ...segment }) => (segment.color ? segment : { text: segment.text, highlighted: segment.highlighted }));
}

/**
 * Verses offered by "Add a verse" when composing a post: the opening of John,
 * in the reader's own edition.
 */
export async function suggestedVerses(): Promise<{ bookId: string; chapter: number; verse: number; text: string }[]> {
  const ref = SAMPLE_CHAPTER.ref;
  let chapter: ChapterText = SAMPLE_CHAPTER;
  try {
    chapter = await fetchChapter(ref);
  } catch {
    // Keep the bundled excerpt.
  }
  return chapter.verses.slice(0, 5).map((v) => {
    const text = v.text.replace(/[;,:—]$/, '');
    return { bookId: ref.bookId, chapter: ref.chapter, verse: v.number, text: text.charAt(0).toUpperCase() + text.slice(1) };
  });
}

export type VerseRun =
  | { kind: 'text'; text: string; highlighted: boolean; color?: string; /** Offset of this run in the verse text. */ start: number }
  | { kind: 'headings'; headings: string[] };

/**
 * A verse as the reader draws it: highlighted and plain runs of text, with any
 * headings that fall inside the verse placed where they belong.
 */
export function verseRuns(verse: Verse, marks: VerseMark[]): VerseRun[] {
  const breaks = [...(verse.breaks ?? [])].sort((a, b) => a.at - b.at);
  const runs: VerseRun[] = [];
  let offset = 0;
  const text = (value: string, segment: VerseSegment, start: number): VerseRun =>
    segment.color
      ? { kind: 'text', text: value, highlighted: segment.highlighted, color: segment.color, start }
      : { kind: 'text', text: value, highlighted: segment.highlighted, start };
  for (const segment of segmentVerse(verse.text, marks)) {
    let rest = segment.text;
    let start = offset;
    offset += rest.length;
    while (breaks[0] && breaks[0].at > start && breaks[0].at < start + rest.length) {
      const cut = breaks[0].at - start;
      runs.push(text(rest.slice(0, cut), segment, start));
      runs.push({ kind: 'headings', headings: breaks[0].headings });
      rest = rest.slice(cut);
      start += cut;
      breaks.shift();
    }
    while (breaks[0] && breaks[0].at <= start) {
      runs.push({ kind: 'headings', headings: breaks[0].headings });
      breaks.shift();
    }
    runs.push(text(rest, segment, start));
  }
  return runs;
}
