import { addDays, toISODate } from './format.ts';
import type { CalendarEvent, ISODate } from './types.ts';

export interface MonthCell {
  date: ISODate;
  day: number;
  inMonth: boolean;
}

/**
 * Weeks of a month, Sunday first, padded with the neighbouring months' days.
 * `month` is 0-based. Returns only as many weeks as the month needs.
 */
export function buildMonthGrid(year: number, month: number): MonthCell[][] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const last = new Date(year, month + 1, 0);
  const weeks: MonthCell[][] = [];
  for (let cursor = start; cursor <= last; ) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: toISODate(cursor), day: cursor.getDate(), inMonth: cursor.getMonth() === month });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function eventsOn(events: CalendarEvent[], date: ISODate): CalendarEvent[] {
  return sortEvents(events.filter((e) => e.date === date));
}

export function eventsInMonth(events: CalendarEvent[], year: number, month: number): CalendarEvent[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return sortEvents(events.filter((e) => e.date.startsWith(prefix)));
}

/** The first event on or after `from`; drives "Next up" and the default selected day. */
export function nextEvent(events: CalendarEvent[], from: ISODate): CalendarEvent | undefined {
  return sortEvents(events).find((e) => e.date >= from);
}

/** iCalendar file for "add to device calendar". Events are assumed to last one hour. */
export function toICS(event: CalendarEvent): string {
  const stamp = (date: ISODate, time: string, addMinutes = 0) => {
    const [h = 0, m = 0] = time.split(':').map(Number);
    const total = h * 60 + m + addMinutes;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${date.replaceAll('-', '')}T${hh}${mm}00`;
  };
  const escape = (s: string) => s.replace(/([,;\\])/g, '\\$1');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Catalysis//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@catalysis.app`,
    `DTSTART:${stamp(event.date, event.time)}`,
    `DTEND:${stamp(event.date, event.time, 60)}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
