/**
 * Daily Mass readings. Which passages are read each day comes from the
 * Lectionary for Mass (United States), as citations; the text comes from the
 * app's own Bible. This module reads citations such as
 * "Jonah 1:1–2:1-2, 11" or "Psalm 22:26b-27, 28-30ab, 30e, 31-32" and gathers
 * their verses.
 */
import { BIBLE_BOOKS, type ChapterRef } from './bible/books.ts';
import type { ChapterText } from './bible/text.ts';
import type { ISODate } from './types.ts';

export type ReadingKind = 'first' | 'psalm' | 'second' | 'gospel';

export const READING_TITLES: Record<ReadingKind, string> = {
  first: 'First Reading',
  psalm: 'Responsorial Psalm',
  second: 'Second Reading',
  gospel: 'Gospel',
};

export const READING_ORDER: ReadingKind[] = ['first', 'psalm', 'second', 'gospel'];

/** One day of the Lectionary: the citation for each reading. */
export type LectionaryDay = { date: ISODate } & Partial<Record<ReadingKind, string>>;

export interface VersePoint {
  c: number;
  v: number;
}

export interface Passage {
  bookId: string;
  /** Ranges, in the order they are read. */
  spans: { from: VersePoint; to: VersePoint }[];
}

/** Names in the Lectionary's citations that differ from the Bible's book names, including two misspellings in the data. */
const ALIASES: Record<string, string> = {
  psalm: 'PSA', psalms: 'PSA', revelation: 'REV', apocalypse: 'REV', sirach: 'SIR', ecclesiasticus: 'SIR',
  'song of songs': 'SNG', ecclesiastes: 'ECC', qoheleth: 'ECC', phiippians: 'PHP', sirarch: 'SIR',
};

const bookByName = new Map(BIBLE_BOOKS.map((b) => [b.name.toLowerCase(), b.id]));

/** A book named in a citation, as a USFM code. */
export function bookOf(name: string): string | undefined {
  const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return bookByName.get(key) ?? ALIASES[key];
}

/** "12", "26b", "1:2", "4befghn": a verse, perhaps with its chapter, with any letters for parts of it dropped. */
const POINT = /^(?:(\d+):)?(\d+)[a-z]*$/i;

/**
 * Tidies the typing slips found in the data: "23: 1-3a", "3b4", "12 cd-20",
 * "&", a closing full stop.
 */
function tidyCitation(text: string): string {
  return text
    .replace(/[—–‐‑]/g, '-')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*-\s*/g, '-')
    .replace(/(\d)\s+(?!and\b|or\b)([a-z]{1,8})(?=[-,;\s]|$)/gi, '$1$2')
    .replace(/(\d)([a-z]+)(\d)/gi, '$1$2-$3')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/[.\s]+$/, '');
}

/**
 * Reads a citation into ranges of verses. Where the Lectionary offers a shorter
 * form ("Matthew 4:12-23 or 4:12-17"), the longer, first form is read. Parts of
 * verses ("26b") are read as whole verses. `undefined` if any part cannot be
 * read, or names a chapter the Bible does not have (Esther's lettered chapters).
 */
export function parsePassage(citation: string): Passage | undefined {
  const first = citation.split(/\s+or\s+/i)[0] ?? '';
  const match = /^\s*((?:[1-3]\s)?[A-Za-z][A-Za-z ]*?)\s+(\d.*)$/.exec(first);
  if (!match) return undefined;
  const bookId = bookOf(match[1] ?? '');
  const book = BIBLE_BOOKS.find((b) => b.id === bookId);
  if (!book) return undefined;

  const items = tidyCitation(match[2] ?? '').split(/\s*(?:[;,]|\band\b)\s*/i).map((x) => x.trim()).filter(Boolean);
  const spans: Passage['spans'] = [];
  // A book of one chapter is cited by verse alone: "Philemon 9-10, 12-17".
  let chapter: number | undefined = book.chapters === 1 ? 1 : undefined;
  for (const item of items) {
    // "9-10-11-12" is read from its first point to its last.
    const points = item.split('-').map((part) => POINT.exec(part));
    if (points.some((p) => !p)) return undefined;
    const [start, ...others] = points as RegExpExecArray[];
    const end = others.length ? others[others.length - 1] : undefined;
    if (!start) return undefined;
    if (start[1]) chapter = Number(start[1]);
    if (chapter === undefined) return undefined;
    const from = { c: chapter, v: Number(start[2]) };
    // The chapter a run ends in is the last one named within it ("1:1-2:1-2" ends in chapter 2).
    for (const p of others) if (p[1]) chapter = Number(p[1]);
    const to = end ? { c: chapter, v: Number(end[2]) } : from;
    spans.push({ from, to });
  }
  // Malachi 4 in older Bibles is Malachi 3:19-24 in the New American Bible.
  if (book.id === 'MAL') {
    for (const span of spans) for (const point of [span.from, span.to]) if (point.c === 4) Object.assign(point, { c: 3, v: point.v + 18 });
  }
  for (const { from, to } of spans) {
    if (from.c < 1 || to.c > book.chapters || to.c < from.c || (to.c === from.c && to.v < from.v)) return undefined;
  }
  return spans.length ? { bookId: book.id, spans } : undefined;
}

/** Where a citation starts, for a link into the Bible reader. */
export function readingRef(citation: string): (ChapterRef & { verse: number }) | undefined {
  const passage = parsePassage(citation);
  const start = passage?.spans[0]?.from;
  return passage && start ? { bookId: passage.bookId, chapter: start.c, verse: start.v } : undefined;
}

export interface ReadingVerse {
  chapter: number;
  number: number;
  text: string;
}

/** The chapters a passage needs. */
export function passageChapters(passage: Passage): number[] {
  const chapters = new Set<number>();
  for (const { from, to } of passage.spans) for (let c = from.c; c <= to.c; c++) chapters.add(c);
  return [...chapters];
}

/* ---------- tidying the text for reading aloud ---------- */

/** A psalm's title, which the Lectionary leaves out: "A psalm of David.", "For the leader. Of David." */
const PSALM_TITLE = /^(?:(?:For the leader|A psalm|A song|A maskil|A miktam|A prayer|A lament|A shiggaion|Of David|Of Asaph|Of Solomon|Of Moses|Of Heman|Of Ethan|Of the Korahites|For remembrance|For thanksgiving|For the sabbath)\b[^.]*\.\s*)+/i;

/**
 * A verse as it is read at Mass: without a psalm's title or "Selah".
 * scripts/import-nabre.mjs already keeps section headings apart from the verse text.
 */
export function cleanVerseText(bookId: string, number: number, text: string): string {
  let out = text;
  if (bookId === 'PSA' && number <= 2) out = out.replace(PSALM_TITLE, '');
  if (bookId === 'PSA') out = out.replace(/\s*\bSelah\b\s*/g, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

/** The passage's verses from the given chapters, each once, in the order read. */
export function passageVerses(passage: Passage, chapters: Map<number, ChapterText>): ReadingVerse[] {
  const out: ReadingVerse[] = [];
  const seen = new Set<string>();
  for (const { from, to } of passage.spans) {
    for (let c = from.c; c <= to.c; c++) {
      const text = chapters.get(c);
      if (!text) continue;
      for (const verse of text.verses) {
        const inside = (c > from.c || verse.number >= from.v) && (c < to.c || verse.number <= to.v);
        const key = `${c}:${verse.number}`;
        if (!inside || seen.has(key)) continue;
        seen.add(key);
        const text = cleanVerseText(passage.bookId, verse.number, verse.text);
        // A verse that was only a psalm's title is left out.
        if (text) out.push({ chapter: c, number: verse.number, text });
      }
    }
  }
  return out;
}

/** The USCCB's page for a day's readings, which has the full Lectionary text. */
export function usccbReadingsUrl(date: ISODate): string {
  const [y = '', m = '', d = ''] = date.split('-');
  return `https://bible.usccb.org/bible/readings/${m}${d}${y.slice(2)}.cfm`;
}
