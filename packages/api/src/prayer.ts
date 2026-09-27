import { addDays, parseISODate, toISODate } from './format.ts';
import type { ISODate, Prayer, PrayerLog } from './types.ts';

/** A day counts toward the streak once this many prayers are complete. */
export const STREAK_THRESHOLD = 1;

function countByDate(logs: PrayerLog[]): Map<ISODate, number> {
  const counts = new Map<ISODate, number>();
  for (const log of logs) counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
  return counts;
}

/**
 * Consecutive days with at least `threshold` completed prayers, ending today.
 * A day that has not been prayed yet does not break the streak until it is over.
 */
export function computeStreak(logs: PrayerLog[], today: ISODate, threshold = STREAK_THRESHOLD): number {
  const counts = countByDate(logs);
  const met = (iso: ISODate) => (counts.get(iso) ?? 0) >= threshold;
  let cursor = parseISODate(today);
  if (!met(today)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (met(toISODate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive days that met the threshold, anywhere in the logs. */
export function longestStreak(logs: PrayerLog[], threshold = STREAK_THRESHOLD): number {
  const days = [...countByDate(logs)].filter(([, n]) => n >= threshold).map(([date]) => date).sort();
  let best = 0;
  let run = 0;
  let previous: ISODate | undefined;
  for (const day of days) {
    run = previous && toISODate(addDays(parseISODate(previous), 1)) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export interface MonthDay {
  date: ISODate;
  day: number;
  state: 'past' | 'today' | 'future';
  /** Share of the rule completed, 0–1. */
  progress: number;
}

/** Every day of the month containing `today`, for the prayer heatmap. */
export function buildMonth(logs: PrayerLog[], today: ISODate, ruleSize: number): MonthDay[] {
  const counts = countByDate(logs);
  const now = parseISODate(today);
  const length = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length }, (_, i) => {
    const date = toISODate(new Date(now.getFullYear(), now.getMonth(), i + 1));
    const progress = ruleSize > 0 ? Math.min(1, (counts.get(date) ?? 0) / ruleSize) : 0;
    return { date, day: i + 1, state: date === today ? 'today' : date > today ? 'future' : 'past', progress };
  });
}

export type WeekDayState = 'done' | 'today' | 'missed' | 'future';

export interface WeekDay {
  date: ISODate;
  /** `M`, `T`, … */
  letter: string;
  /** `Mon`, `Tue`, … */
  short: string;
  state: WeekDayState;
  /** Share of the rule completed, 0–1. */
  progress: number;
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SHORTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first week containing `today`, for the seven-bar tracker. */
export function buildWeek(logs: PrayerLog[], today: ISODate, ruleSize: number): WeekDay[] {
  const counts = countByDate(logs);
  const now = parseISODate(today);
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  return LETTERS.map((letter, i) => {
    const date = toISODate(addDays(monday, i));
    const count = counts.get(date) ?? 0;
    const progress = ruleSize > 0 ? Math.min(1, count / ruleSize) : 0;
    let state: WeekDayState;
    if (date === today) state = 'today';
    else if (date > today) state = 'future';
    else state = count >= STREAK_THRESHOLD ? 'done' : 'missed';
    return { date, letter, short: SHORTS[i] ?? '', state, progress };
  });
}

export interface RuleRow {
  prayer: Prayer;
  index: number;
  log?: PrayerLog;
  done: boolean;
  /** The first prayer still to be prayed today. */
  next: boolean;
}

/** Today's rule in schedule order, with completion state. */
export function buildRule(prayers: Prayer[], logs: PrayerLog[], today: ISODate): RuleRow[] {
  const todays = new Map(logs.filter((l) => l.date === today).map((l) => [l.prayerId, l]));
  const ordered = [...prayers].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  let nextAssigned = false;
  return ordered.map((prayer, i) => {
    const log = todays.get(prayer.id);
    const next = !log && !nextAssigned;
    if (next) nextAssigned = true;
    return { prayer, index: i + 1, log, done: Boolean(log), next };
  });
}
