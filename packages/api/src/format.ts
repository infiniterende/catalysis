import type { ISODate } from './types.ts';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
/** Editorial abbreviations, as set in the designs ("Sept"). */
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] as const;

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parses `YYYY-MM-DD` as a local date (never UTC, so the day cannot shift). */
export function parseISODate(iso: ISODate): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISODate(iso), days));
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** `Sat 26 Sept` */
export function formatDayShort(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** `Saturday, 26 September 2026` */
export function formatDayLong(d: Date, withYear = true): string {
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

function splitTime(time: string | Date): { h: number; m: number } {
  if (time instanceof Date) return { h: time.getHours(), m: time.getMinutes() };
  const [h = 0, m = 0] = time.split(':').map(Number);
  return { h, m };
}

/** `17:30` */
export function formatTime24(time: string | Date): string {
  const { h, m } = splitTime(time);
  return `${h}:${pad2(m)}`;
}

/** `5:30 PM` */
export function formatTime12(time: string | Date): string {
  const { h, m } = splitTime(time);
  return `${h % 12 || 12}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** `{ clock: '7:00', meridiem: 'PM' }` for the two-line event time. */
export function splitTime12(time: string | Date): { clock: string; meridiem: 'AM' | 'PM' } {
  const { h, m } = splitTime(time);
  return { clock: `${h % 12 || 12}:${pad2(m)}`, meridiem: h < 12 ? 'AM' : 'PM' };
}

/** `9 PM`, or `9:30 PM` when not on the hour. */
export function formatHour(time: string | Date): string {
  const { h, m } = splitTime(time);
  return `${h % 12 || 12}${m ? `:${pad2(m)}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** `2 hours ago` (long) or `2h` (short). */
export function relativeTime(iso: string, now: Date, style: 'long' | 'short' = 'long'): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  const pick = (n: number, unit: string, abbr: string) =>
    style === 'short' ? `${n}${abbr}` : `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (mins < 1) return style === 'short' ? 'now' : 'Just now';
  if (mins < 60) return pick(mins, 'minute', 'm');
  const hours = Math.round(mins / 60);
  if (hours < 24) return pick(hours, 'hour', 'h');
  const days = Math.round(hours / 24);
  if (days < 7) return pick(days, 'day', 'd');
  return pick(Math.round(days / 7), 'week', 'w');
}

/** `2.4k`, `980` */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
}

export function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let rest = Math.max(0, Math.floor(n));
  for (const [value, numeral] of table) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const ORDINAL_ONES = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
  'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth',
];
const ORDINAL_TENS = ['', '', 'Twentieth', 'Thirtieth', 'Fortieth', 'Fiftieth', 'Sixtieth', 'Seventieth', 'Eightieth', 'Ninetieth'];

/** `One` … `One Hundred Fifty` (chapter labels). */
export function numberWords(n: number): string {
  if (n <= 0) return String(n);
  if (n < 20) return ONES[n] ?? String(n);
  if (n < 100) {
    const ones = n % 10;
    return `${TENS[Math.floor(n / 10)]}${ones ? `-${ONES[ones]}` : ''}`;
  }
  if (n < 1000) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} Hundred${rest ? ` ${numberWords(rest)}` : ''}`;
  }
  return String(n);
}

/** `Twenty-Sixth` */
export function ordinalWords(n: number): string {
  if (n <= 0 || n >= 100) return ordinalSuffix(n);
  if (n < 20) return ORDINAL_ONES[n] ?? String(n);
  const ones = n % 10;
  const tens = Math.floor(n / 10);
  return ones ? `${TENS[tens]}-${ORDINAL_ONES[ones]}` : (ORDINAL_TENS[tens] ?? String(n));
}

/** `26th` */
export function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** `Maria Acosta` → `M` */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '·';
}
