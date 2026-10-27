/**
 * The Liturgy of the Hours: which hours there are, which one to offer now, and
 * the shape of an hour's text as the server sends it. The text comes from an
 * outside source (see apps/web/lib/server/hours.ts).
 */
import type { ISODate, LiturgicalDay } from './types.ts';

export type HourId = 'readings' | 'lauds' | 'daytime' | 'vespers' | 'compline';

export interface HourInfo {
  id: HourId;
  title: string;
  /** A short name for tabs. */
  short: string;
  /** Local hour of the day from which this is the hour to pray. */
  from: number;
}

export const HOURS: HourInfo[] = [
  { id: 'readings', title: 'Office of Readings', short: 'Readings', from: 0 },
  { id: 'lauds', title: 'Morning Prayer', short: 'Morning', from: 5 },
  { id: 'daytime', title: 'Daytime Prayer', short: 'Daytime', from: 10 },
  { id: 'vespers', title: 'Evening Prayer', short: 'Evening', from: 16 },
  { id: 'compline', title: 'Night Prayer', short: 'Night', from: 20 },
];

export const isHourId = (value: unknown): value is HourId => HOURS.some((h) => h.id === value);
export const hourInfo = (id: HourId): HourInfo => HOURS.find((h) => h.id === id) ?? HOURS[1]!;

/** The hour to offer at a given time: Morning Prayer from five, and so on through Night Prayer. */
export function currentHour(now: Date): HourId {
  const hour = now.getHours();
  let found: HourId = 'compline';
  for (const info of HOURS) if (info.id !== 'readings' && hour >= info.from) found = info.id;
  // Between midnight and five, Night Prayer of the evening before is still the hour.
  return hour < 5 ? 'compline' : found;
}

/** A run of an hour's text. `r` is a rubric, printed in red; `i` is italic. */
export interface HourSpan {
  t: string;
  s?: 'r' | 'i';
}

export interface HourLine {
  spans: HourSpan[];
  /** A continuation line of a psalm verse, set in from the margin. */
  indent?: boolean;
}

/** A paragraph: a run of lines. */
export type HourPara = HourLine[];

export interface HourSection {
  title: string;
  paras: HourPara[];
}

export interface HourText {
  date: ISODate;
  hour: HourId;
  /** The day as the source names it, e.g. "Tuesday of the Thirtieth Week in Ordinary Time". */
  day: string;
  sections: HourSection[];
  source: { name: string; url: string };
  /** Copyright lines to show with the text. */
  notice: string;
}

const STOP = new Set([
  'solemnity', 'feast', 'memorial', 'optional', 'commemoration', 'the', 'of', 'and', 'our', 'lord', 'saint', 'saints.',
  'st.', 'sts.', 'blessed', 'virgin', 'mary', 'jesus', 'christ', 'day', 'sunday', 'week', 'in', 'a', 'an', 'all', 'holy',
]);

const words = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

/**
 * True when the day is a solemnity or feast that the source's text does not
 * appear to be for. The source used today follows the seasons and the psalter
 * but not always the calendar of saints, so on such days the app says so.
 */
export function sourceMissesCelebration(day: Pick<LiturgicalDay, 'rank' | 'celebration' | 'shortName'>, sourceDay: string): boolean {
  if (day.rank !== 'solemnity' && day.rank !== 'feast') return false;
  const ours = new Set([...words(day.celebration), ...words(day.shortName)]);
  if (ours.size === 0) return false;
  return !words(sourceDay).some((w) => ours.has(w));
}
