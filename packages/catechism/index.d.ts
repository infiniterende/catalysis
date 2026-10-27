/** A place in the Bible: USFM book code, chapter and, when given, verse. */
export interface CccScripture {
  b: string;
  c: number;
  v?: number;
}

/** A run of text: plain, styled, a footnote marker, or a Scripture reference. */
export type CccRun =
  | string
  | { t: string; i?: 1; b?: 1 }
  | { f: string }
  | { t: string; s: CccScripture; i?: 1 };

export type CccBlock =
  /** A heading within a page: 1 "In Brief", 2 a section, 3 a run-in subheading. */
  | { h: string; l: 1 | 2 | 3 }
  /** A paragraph. `n` is set where a numbered paragraph begins; `q` marks a quotation set apart. */
  | { n?: number; q?: 1; r: CccRun[] };

export interface CccNoteRef {
  t: string;
  s?: CccScripture;
}

export interface CccPage {
  id: string;
  label?: string;
  title: string;
  /** Titles of the parts, sections, chapters and articles the page sits in. */
  path: string[];
  blocks: CccBlock[];
  /** Footnotes, keyed by the marker in the text. */
  notes: Record<string, CccNoteRef[]>;
}

export interface CccTocEntry {
  id: string;
  /** 1 for the Prologue and the four Parts. */
  depth: number;
  label?: string;
  title: string;
  /** The page holding this entry's text. Headings that only group pages have none. */
  page?: string;
  /** The paragraphs beneath this entry. The Credo, which has no numbered paragraphs, has none. */
  first?: number;
  last?: number;
  /** Where everything beneath this entry ends, when that is beyond its own paragraphs. */
  end?: number;
}

export declare function loadCatechismToc(): Promise<CccTocEntry[]>;
export declare function loadCatechismPage(id: string): Promise<CccPage | undefined>;
export declare function loadCatechismSearch(): Promise<[number, string][]>;
