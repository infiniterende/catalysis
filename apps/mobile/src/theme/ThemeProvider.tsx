import * as SystemUI from 'expo-system-ui';
import { createContext, use, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance as NativeAppearance, Platform, useColorScheme } from 'react-native';

import { setAppearance, useAppearance, type Appearance } from '@/lib/appearance';

import { palettes, type Scheme, type ThemeColors } from './tokens';

export interface Theme {
  /** `genz.light` or `genz.dark`, merged with the fixed colours. */
  colors: ThemeColors;
  /** The theme on screen. */
  scheme: Scheme;
  /** The user's choice; `system` follows the phone. */
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

const ThemeContext = createContext<Theme>({
  colors: palettes.light,
  scheme: 'light',
  appearance: 'system',
  setAppearance,
});

/**
 * Provides the theme. The saved choice is read by `loadAppearance()` (src/lib/appearance),
 * which the root layout awaits before hiding the splash screen.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  const system = useColorScheme();
  const scheme: Scheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const colors = palettes[scheme];

  // Native chrome (keyboard, alerts, share sheet) follows the choice too.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      NativeAppearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
    } catch {
      // Older systems cannot override the scheme; the app's own colours still switch.
    }
  }, [appearance]);

  // The root view shows through during transitions and behind the keyboard.
  useEffect(() => {
    try {
      SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
    } catch {
      // Not available on this platform; the screens paint their own background.
    }
  }, [colors.bg]);

  const theme = useMemo<Theme>(
    () => ({ colors, scheme, appearance, setAppearance }),
    [colors, scheme, appearance],
  );

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}

export type StyleFactory<T> = (colors: ThemeColors, scheme: Scheme) => T;

// One style sheet per factory per theme, shared by every component that uses it.
const sheets = new WeakMap<object, Partial<Record<Scheme, unknown>>>();

/**
 * Themed styles. Define the factory at module level and return `StyleSheet.create(...)` from it:
 *
 *   const themed = (c: ThemeColors) => StyleSheet.create({ title: { ...display(24), color: c.ink } });
 *   const styles = useStyles(themed);
 */
export function useStyles<T>(factory: StyleFactory<T>): T {
  const { colors, scheme } = useTheme();
  let entry = sheets.get(factory);
  if (!entry) {
    entry = {};
    sheets.set(factory, entry);
  }
  if (!(scheme in entry)) entry[scheme] = factory(colors, scheme);
  return entry[scheme] as T;
}
