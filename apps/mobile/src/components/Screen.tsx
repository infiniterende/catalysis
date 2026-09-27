// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import { useIsFocused, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, TAB_BAR_SPACE } from '@/theme';

export type ScreenTone = 'paper' | 'reader' | 'black';

const BACKGROUNDS: Record<ScreenTone, string> = {
  paper: colors.paper,
  reader: colors.paperReader,
  black: colors.black,
};

/**
 * Sets the status bar for the screen that has focus. Tab screens stay mounted,
 * so a plain `<StatusBar>` in each would leave the last-mounted one in charge.
 */
export function FocusedStatusBar({ style }: { style: 'light' | 'dark' }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} /> : null;
}

interface ScreenProps {
  children: ReactNode;
  tone?: ScreenTone;
  /** Pads the top by the status-bar inset. Full-bleed screens (Reels) opt out. */
  padTop?: boolean;
  /** Pads the bottom by the home-indicator inset, for screens without a tab bar or pinned footer. */
  padBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Legacy screens are static: they keep the light palette whatever the theme. */
export function Screen({ children, tone = 'paper', padTop = true, padBottom = false, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const segments: string[] = useSegments();
  // The old tab bar took up layout space; the new one floats. Until a tab screen is
  // restyled, this keeps its content clear of the bar. Events no longer shows the bar.
  const underTabBar = segments[0] === '(tabs)' && segments[1] !== 'events';
  const bottom = underTabBar ? TAB_BAR_SPACE + insets.bottom : padBottom ? insets.bottom : 0;
  return (
    <View
      style={[
        styles.fill,
        { backgroundColor: BACKGROUNDS[tone], paddingBottom: bottom },
        padTop && { paddingTop: insets.top },
        style,
      ]}>
      <FocusedStatusBar style={tone === 'black' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
