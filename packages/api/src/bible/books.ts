import { numberWords, roman } from '../format.ts';

export type Testament = 'Old Testament' | 'New Testament';

export interface BibleBook {
  /** USFM code, e.g. `JHN`. */
  id: string;
  name: string;
  chapters: number;
  testament: Testament;
  /** Crimson label above the title, e.g. `The Gospel according to`. */
  kicker: string;
  /** Large title under the kicker, e.g. `John`. */
  title: string;
  /** Deuterocanonical books are missing from the Douay-Rheims fallback source. */
  deuterocanonical?: boolean;
}

type Row = [id: string, name: string, chapters: number, kicker: string, title?: string, deutero?: boolean];

// Catholic canon; chapter counts follow the NABRE (Joel has four chapters, Malachi three).
const OLD: Row[] = [
  ['GEN', 'Genesis', 50, 'The Book of'],
  ['EXO', 'Exodus', 40, 'The Book of'],
  ['LEV', 'Leviticus', 27, 'The Book of'],
  ['NUM', 'Numbers', 36, 'The Book of'],
  ['DEU', 'Deuteronomy', 34, 'The Book of'],
  ['JOS', 'Joshua', 24, 'The Book of'],
  ['JDG', 'Judges', 21, 'The Book of'],
  ['RUT', 'Ruth', 4, 'The Book of'],
  ['1SA', '1 Samuel', 31, 'The First Book of', 'Samuel'],
  ['2SA', '2 Samuel', 24, 'The Second Book of', 'Samuel'],
  ['1KI', '1 Kings', 22, 'The First Book of the', 'Kings'],
  ['2KI', '2 Kings', 25, 'The Second Book of the', 'Kings'],
  ['1CH', '1 Chronicles', 29, 'The First Book of the', 'Chronicles'],
  ['2CH', '2 Chronicles', 36, 'The Second Book of the', 'Chronicles'],
  ['EZR', 'Ezra', 10, 'The Book of'],
  ['NEH', 'Nehemiah', 13, 'The Book of'],
  ['TOB', 'Tobit', 14, 'The Book of', undefined, true],
  ['JDT', 'Judith', 16, 'The Book of', undefined, true],
  ['EST', 'Esther', 10, 'The Book of'],
  ['JOB', 'Job', 42, 'The Book of'],
  ['PSA', 'Psalms', 150, 'The Book of'],
  ['PRO', 'Proverbs', 31, 'The Book of'],
  ['ECC', 'Ecclesiastes', 12, 'The Book of'],
  ['SNG', 'Song of Songs', 8, 'The', 'Song of Songs'],
  ['WIS', 'Wisdom', 19, 'The Book of', undefined, true],
  ['SIR', 'Sirach', 51, 'The Book of', undefined, true],
  ['ISA', 'Isaiah', 66, 'The Book of the Prophet'],
  ['JER', 'Jeremiah', 52, 'The Book of the Prophet'],
  ['LAM', 'Lamentations', 5, 'The Book of'],
  ['BAR', 'Baruch', 6, 'The Book of', undefined, true],
  ['EZK', 'Ezekiel', 48, 'The Book of the Prophet'],
  ['DAN', 'Daniel', 14, 'The Book of the Prophet'],
  ['HOS', 'Hosea', 14, 'The Book of the Prophet'],
  ['JOL', 'Joel', 4, 'The Book of the Prophet'],
  ['AMO', 'Amos', 9, 'The Book of the Prophet'],
  ['OBA', 'Obadiah', 1, 'The Book of the Prophet'],
  ['JON', 'Jonah', 4, 'The Book of the Prophet'],
  ['MIC', 'Micah', 7, 'The Book of the Prophet'],
  ['NAM', 'Nahum', 3, 'The Book of the Prophet'],
  ['HAB', 'Habakkuk', 3, 'The Book of the Prophet'],
  ['ZEP', 'Zephaniah', 3, 'The Book of the Prophet'],
  ['HAG', 'Haggai', 2, 'The Book of the Prophet'],
  ['ZEC', 'Zechariah', 14, 'The Book of the Prophet'],
  ['MAL', 'Malachi', 3, 'The Book of the Prophet'],
  ['1MA', '1 Maccabees', 16, 'The First Book of the', 'Maccabees', true],
  ['2MA', '2 Maccabees', 15, 'The Second Book of the', 'Maccabees', true],
];

const NEW: Row[] = [
  ['MAT', 'Matthew', 28, 'The Gospel according to'],
  ['MRK', 'Mark', 16, 'The Gospel according to'],
  ['LUK', 'Luke', 24, 'The Gospel according to'],
  ['JHN', 'John', 21, 'The Gospel according to'],
  ['ACT', 'Acts', 28, 'The', 'Acts of the Apostles'],
  ['ROM', 'Romans', 16, 'The Letter of St. Paul to the'],
  ['1CO', '1 Corinthians', 16, 'The First Letter of St. Paul to the', 'Corinthians'],
  ['2CO', '2 Corinthians', 13, 'The Second Letter of St. Paul to the', 'Corinthians'],
  ['GAL', 'Galatians', 6, 'The Letter of St. Paul to the'],
  ['EPH', 'Ephesians', 6, 'The Letter of St. Paul to the'],
  ['PHP', 'Philippians', 4, 'The Letter of St. Paul to the'],
  ['COL', 'Colossians', 4, 'The Letter of St. Paul to the'],
  ['1TH', '1 Thessalonians', 5, 'The First Letter of St. Paul to the', 'Thessalonians'],
  ['2TH', '2 Thessalonians', 3, 'The Second Letter of St. Paul to the', 'Thessalonians'],
  ['1TI', '1 Timothy', 6, 'The First Letter of St. Paul to', 'Timothy'],
  ['2TI', '2 Timothy', 4, 'The Second Letter of St. Paul to', 'Timothy'],
  ['TIT', 'Titus', 3, 'The Letter of St. Paul to'],
  ['PHM', 'Philemon', 1, 'The Letter of St. Paul to'],
  ['HEB', 'Hebrews', 13, 'The Letter to the'],
  ['JAS', 'James', 5, 'The Letter of'],
  ['1PE', '1 Peter', 5, 'The First Letter of', 'Peter'],
  ['2PE', '2 Peter', 3, 'The Second Letter of', 'Peter'],
  ['1JN', '1 John', 5, 'The First Letter of', 'John'],
  ['2JN', '2 John', 1, 'The Second Letter of', 'John'],
  ['3JN', '3 John', 1, 'The Third Letter of', 'John'],
  ['JUD', 'Jude', 1, 'The Letter of'],
  ['REV', 'Revelation', 22, 'The', 'Revelation to John'],
];

const build = (rows: Row[], testament: Testament): BibleBook[] =>
  rows.map(([id, name, chapters, kicker, title, deuterocanonical]) => ({
    id, name, chapters, testament, kicker, title: title ?? name, deuterocanonical,
  }));

export const BIBLE_BOOKS: BibleBook[] = [...build(OLD, 'Old Testament'), ...build(NEW, 'New Testament')];

const byId = new Map(BIBLE_BOOKS.map((b) => [b.id, b]));

export function getBook(id: string): BibleBook | undefined {
  return byId.get(id.toUpperCase());
}

export function booksOf(testament: Testament): BibleBook[] {
  return BIBLE_BOOKS.filter((b) => b.testament === testament);
}

export interface ChapterRef {
  bookId: string;
  chapter: number;
}

/** Neighbouring chapter across book boundaries, or `undefined` at either end of the canon. */
export function adjacentChapter(ref: ChapterRef, direction: 1 | -1): ChapterRef | undefined {
  const index = BIBLE_BOOKS.findIndex((b) => b.id === ref.bookId);
  const book = BIBLE_BOOKS[index];
  if (!book) return undefined;
  const chapter = ref.chapter + direction;
  if (chapter >= 1 && chapter <= book.chapters) return { bookId: book.id, chapter };
  const neighbour = BIBLE_BOOKS[index + direction];
  if (!neighbour) return undefined;
  return { bookId: neighbour.id, chapter: direction === 1 ? 1 : neighbour.chapters };
}

/** `John 2` */
export function chapterLabel(ref: ChapterRef): string {
  return `${getBook(ref.bookId)?.name ?? ref.bookId} ${ref.chapter}`;
}

/** `John · I` */
export function chapterHeading(ref: ChapterRef): string {
  return `${getBook(ref.bookId)?.name ?? ref.bookId} · ${roman(ref.chapter)}`;
}

/** `Chapter One — The Word Became Flesh`; Psalms are numbered `Psalm Twenty-Three`. */
export function chapterTitle(ref: ChapterRef, title?: string): string {
  const unit = ref.bookId === 'PSA' ? 'Psalm' : 'Chapter';
  const base = `${unit} ${numberWords(ref.chapter)}`;
  return title ? `${base} — ${title}` : base;
}

/** `John 1:4` or `John 1:4–5` */
export function verseLabel(bookId: string, chapter: number, verseStart: number, verseEnd = verseStart): string {
  const name = getBook(bookId)?.name ?? bookId;
  const range = verseEnd > verseStart ? `${verseStart}–${verseEnd}` : String(verseStart);
  return `${name} ${chapter}:${range}`;
}

/** Groups verse numbers into runs of consecutive verses: `[3, 4, 5, 9]` → `[[3, 5], [9, 9]]`. */
export function verseRanges(verses: number[]): [start: number, end: number][] {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const verse of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && verse === last[1] + 1) last[1] = verse;
    else ranges.push([verse, verse]);
  }
  return ranges;
}

/** `John 3:16–18`, or `John 3:16, 18–19` when the verses are not all together. */
export function versesLabel(bookId: string, chapter: number, verses: number[]): string {
  const name = getBook(bookId)?.name ?? bookId;
  const parts = verseRanges(verses).map(([start, end]) => (end > start ? `${start}–${end}` : String(start)));
  return `${name} ${chapter}:${parts.join(', ')}`;
}
