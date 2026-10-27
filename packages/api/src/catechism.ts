/**
 * Working with the Catechism of the Catholic Church: references such as
 * "CCC 2838–2845", and finding the page that holds a paragraph. The text itself
 * is in @catalysis/catechism, which each app loads on demand.
 */

export const CCC_PARAGRAPHS = 2865;

export interface CccRange {
  start: number;
  end: number;
}

/**
 * The paragraphs a reference names: "CCC 1030", "CCC 2838–2845", "CCC 1324, 1327"
 * (the first), "Catechism 27". `undefined` for anything else.
 */
export function parseCccReference(text: string): CccRange | undefined {
  const match = /^\s*(?:CCC|Catechism(?: of the Catholic Church)?)\s*(?:§|¶|nos?\.)?\s*(\d{1,4})(?:\s*[–—-]\s*(\d{1,4}))?/i.exec(text);
  if (!match) return undefined;
  const [, from = '', to] = match;
  const start = Number(from);
  let end = to ? Number(to) : start;
  // "CCC 2838–45" means 2838 to 2845.
  if (to && to.length < from.length) end = Number(from.slice(0, from.length - to.length) + to);
  if (start < 1 || start > CCC_PARAGRAPHS || end < start) return undefined;
  return { start, end: Math.min(end, CCC_PARAGRAPHS) };
}

/** A bare paragraph number typed into a search box: "2267", "§2267", "ccc 2267". */
export function parseCccNumber(text: string): number | undefined {
  const match = /^\s*(?:ccc\s*)?§?\s*(\d{1,4})\s*$/i.exec(text);
  const n = match ? Number(match[1]) : NaN;
  return n >= 1 && n <= CCC_PARAGRAPHS ? n : undefined;
}

export const catechismHref = (paragraph: number) => `/catechism/${paragraph}`;
export const catechismPageHref = (page: string) => `/catechism/${page}`;

export function cccLabel(range: CccRange): string {
  return range.end > range.start ? `CCC ${range.start}–${range.end}` : `CCC ${range.start}`;
}

/** The smallest piece of the table of contents that has a page of its own and holds the paragraph. */
export function cccPageFor<T extends { page?: string; first?: number; last?: number; depth: number }>(toc: T[], paragraph: number): T | undefined {
  let best: T | undefined;
  for (const entry of toc) {
    if (!entry.page || entry.first === undefined || entry.last === undefined) continue;
    if (paragraph < entry.first || paragraph > entry.last) continue;
    // A page's own paragraphs end where its first sub-page begins, so the deepest match is the page that prints it.
    if (!best || entry.depth >= best.depth) best = entry;
  }
  return best;
}

/** The paragraphs an entry of the table of contents covers, including everything beneath it. */
export function cccSpan(entry: { first?: number; last?: number; end?: number }): CccRange | undefined {
  if (entry.first === undefined) return undefined;
  return { start: entry.first, end: entry.end ?? entry.last ?? entry.first };
}

/**
 * The day's portion of the Catechism read through in a year: about eight
 * paragraphs a day, in order, starting again each 1 January.
 */
export function cccForDay(date: string): CccRange {
  const [y = 2026, m = 1, d = 1] = date.split('-').map(Number);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = leap ? 366 : 365;
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000);
  const start = Math.floor((dayOfYear * CCC_PARAGRAPHS) / days) + 1;
  const end = Math.floor(((dayOfYear + 1) * CCC_PARAGRAPHS) / days);
  return { start, end: Math.max(start, end) };
}
