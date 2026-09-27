import { toISODate } from '@catalysis/api';
import { useEffect, useState } from 'react';

/** The current time, refreshed every half minute so greetings, "next" rows and dates stay true. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Today's date as `YYYY-MM-DD`, in local time. */
export function useToday(): { now: Date; today: string } {
  const now = useNow();
  return { now, today: toISODate(now) };
}
