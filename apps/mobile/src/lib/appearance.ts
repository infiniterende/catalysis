import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/** The user's choice in Profile → Appearance. `system` follows the phone. */
export type Appearance = 'system' | 'light' | 'dark';

export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

const STORAGE_KEY = 'catalysis.appearance';

let current: Appearance = 'system';
const listeners = new Set<() => void>();

const isAppearance = (value: unknown): value is Appearance =>
  value === 'system' || value === 'light' || value === 'dark';

/** Reads the saved choice once; the root layout holds the splash screen until it resolves. */
export async function loadAppearance(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isAppearance(saved) && saved !== current) {
      current = saved;
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Without storage the app simply follows the system.
  }
}

export function getAppearance(): Appearance {
  return current;
}

/** Applies the choice at once and saves it for the next launch. */
export function setAppearance(next: Appearance): void {
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
  AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
    // The choice still holds for this session.
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, getAppearance, getAppearance);
}
