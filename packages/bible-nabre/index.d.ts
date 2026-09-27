export interface NabreBreak {
  /** Character offset into `t` where the headings fall. */
  at: number;
  h: string[];
}

export interface NabreVerse {
  n: number;
  t: string;
  /** Headings that stand before the verse. */
  h?: string[];
  /** Headings that fall inside the verse. */
  m?: NabreBreak[];
}

export interface NabreBook {
  /** USFM code, e.g. `JHN`. */
  id: string;
  /** `chapters[0]` is chapter 1. */
  chapters: NabreVerse[][];
}

/** Chapters per book, keyed by USFM code. */
export declare const NABRE_CHAPTERS: Record<string, number>;

/** Loads one book on demand. Resolves to `undefined` for an unknown code. */
export declare function loadNabreBook(id: string): Promise<NabreBook | undefined>;
