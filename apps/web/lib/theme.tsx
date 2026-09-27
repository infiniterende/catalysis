'use client';

import type { GenZTheme } from '@catalysis/ui-tokens';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { THEME_KEY as KEY } from './theme-script';

const listeners = new Set<() => void>();

function read(): GenZTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const ThemeContext = createContext<{ theme: GenZTheme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, read, () => 'light' as GenZTheme);
  const toggle = useCallback(() => {
    const next: GenZTheme = read() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // The choice still holds for this visit.
    }
    listeners.forEach((notify) => notify());
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
