'use client';

import { breakpoints } from '@catalysis/ui-tokens';
import { toISODate } from '@catalysis/api';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True from 768px: the desktop layouts. Below it the mobile layouts are used. */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.mobile}px)`);
}

/** True from 1024px, where the side columns sit beside the main column. */
export function useIsWide(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
}

/** The current time, refreshed every minute so dates and "2 hours ago" stay true. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function useToday(): { now: Date; today: string } {
  const now = useNow();
  return { now, today: toISODate(now) };
}

/** Closes on Escape and restores focus to whatever opened the layer. */
export function useDismiss(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open]);
}
