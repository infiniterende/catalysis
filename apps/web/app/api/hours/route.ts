import { isHourId, toISODate, type ISODate } from '@catalysis/api';
import { allowAttempt, clientKey, json } from '@/lib/server/auth';
import { fetchHour, hoursEnabled, storedHour } from '@/lib/server/hours';
import { IBREVIARY, SourceError } from '@/lib/server/ibreviary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** iBreviary can be slow; three attempts of three requests each need time. */
export const maxDuration = 60;

const DAY = 86_400_000;
/** How far from today a date may be. Each new date costs a request to iBreviary. */
const PAST_DAYS = 31;
const FUTURE_DAYS = 92;

/** Kept by browsers and shared caches for a day, and served stale for a week while refreshed. */
const CACHED = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' };

function validDate(value: string | null): ISODate | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const time = Date.parse(`${value}T12:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return undefined;
  const today = Date.parse(`${toISODate(new Date())}T12:00:00Z`);
  if (time < today - PAST_DAYS * DAY || time > today + FUTURE_DAYS * DAY) return undefined;
  return value;
}

/**
 * GET /api/hours?date=YYYY-MM-DD&hour=lauds → the hour's text (HourText).
 * Open to everyone, including visitors trying the demo: it holds no one's data.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hour = params.get('hour');
  const date = validDate(params.get('date'));
  if (!isHourId(hour)) return json({ error: 'Choose an hour: readings, lauds, daytime, vespers or compline.' }, { status: 400 });
  if (!date) return json({ error: `Choose a real date, within a month before and three months after today.` }, { status: 400 });
  if (!hoursEnabled()) return json({ error: 'The Liturgy of the Hours is not available in the app just now.', link: IBREVIARY.url }, { status: 503 });

  const stored = await storedHour(date, hour);
  if (stored) return json(stored, { headers: CACHED });

  // Only a request that reaches iBreviary counts against the limit.
  if (!allowAttempt(`hours:${clientKey(request)}`, 30)) {
    return json({ error: 'That’s a lot of new pages at once. Try again in a few minutes.' }, { status: 429 });
  }
  try {
    return json(await fetchHour(date, hour), { headers: CACHED });
  } catch (error) {
    if (!(error instanceof SourceError)) console.error('[hours]', error);
    else console.warn('[hours]', date, hour, error.message);
    return json({ error: 'iBreviary, where these texts come from, could not be reached just now. Please try again in a moment.', link: IBREVIARY.url }, { status: 503 });
  }
}
