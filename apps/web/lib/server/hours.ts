/**
 * The Liturgy of the Hours, fetched from iBreviary once per hour per day and
 * kept: in the database when there is one, and in memory. Everyone then reads
 * the stored copy, so iBreviary sees one request per hour per day, not one per reader.
 */
import type { HourId, HourSection, HourText, ISODate } from '@catalysis/api';
import { db, isDatabaseConfigured, type Prisma } from '@catalysis/db';
import { fetchFromIbreviary, IBREVIARY } from './ibreviary';

export const HOURS_NOTICE =
  'English texts of the Liturgy of the Hours © International Commission on English in the Liturgy Corporation and other rights holders, as published by iBreviary.';

/** `HOURS_SOURCE=off` turns the outside source off; the app then links to iBreviary instead. */
export const hoursEnabled = () => (process.env.HOURS_SOURCE ?? '').toLowerCase() !== 'off';

const MEMORY_LIMIT = 300;
const memory = new Map<string, HourText>();
const inFlight = new Map<string, Promise<HourText>>();

const keyOf = (date: ISODate, hour: HourId) => `${date}/${hour}`;

const remember = (text: HourText) => {
  const key = keyOf(text.date, text.hour);
  memory.delete(key);
  memory.set(key, text);
  if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value as string);
};

const build = (date: ISODate, hour: HourId, day: string, sections: HourSection[]): HourText => ({
  date, hour, day, sections, source: IBREVIARY, notice: HOURS_NOTICE,
});

/** The stored copy, if there is one. */
export async function storedHour(date: ISODate, hour: HourId): Promise<HourText | undefined> {
  const kept = memory.get(keyOf(date, hour));
  if (kept) return kept;
  if (!isDatabaseConfigured()) return undefined;
  try {
    const row = await db().hourText.findUnique({ where: { date_hour_lang: { date, hour, lang: 'en' } } });
    if (!row) return undefined;
    const text = build(date, hour, row.day, row.sections as unknown as HourSection[]);
    remember(text);
    return text;
  } catch (error) {
    console.error('[hours] read', error instanceof Error ? error.message : error);
    return undefined;
  }
}

/** Fetches an hour from iBreviary and keeps it. Simultaneous requests for the same hour share one fetch. */
export function fetchHour(date: ISODate, hour: HourId): Promise<HourText> {
  const key = keyOf(date, hour);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const job = (async () => {
    const { day, sections } = await fetchFromIbreviary(date, hour);
    const text = build(date, hour, day, sections);
    remember(text);
    if (isDatabaseConfigured()) {
      try {
        const data = { day, sections: sections as unknown as Prisma.InputJsonValue, fetchedAt: new Date() };
        await db().hourText.upsert({
          where: { date_hour_lang: { date, hour, lang: 'en' } },
          update: data,
          create: { date, hour, lang: 'en', ...data },
        });
      } catch (error) {
        console.error('[hours] store', error instanceof Error ? error.message : error);
      }
    }
    return text;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}
