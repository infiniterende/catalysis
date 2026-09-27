import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE, useTheme } from '@/theme';

/**
 * Sets the status bar for the screen that has focus. Tab screens stay mounted,
 * so a plain `<StatusBar>` in each would leave the last-mounted one in charge.
 * `auto` follows the theme: dark icons on the light theme, light on the dark.
 */
export function FocusedStatusBar({ style = 'auto' }: { style?: 'auto' | 'light' | 'dark' }) {
  const focused = useIsFocused();
  const { scheme } = useTheme();
  if (!focused) return null;
  return <StatusBar style={style === 'auto' ? (scheme === 'dark' ? 'light' : 'dark') : style} />;
}

/**
 * Bottom padding for content on a screen that shows the floating tab bar:
 * `TAB_BAR_SPACE` plus the bottom safe-area inset. Use it as the
 * `paddingBottom` of a scroll view's content so the list runs under the bar.
 */
export function useTabBarSpace(): number {
  return TAB_BAR_SPACE + useSafeAreaInsets().bottom;
}

export interface ScreenProps {
  children: ReactNode;
  /** `bg` by default. `photo` is the near-black behind the camera and full-bleed media. */
  background?: 'bg' | 'card' | 'inset' | 'photo';
  /** Pads the top by the status-bar inset. Full-bleed screens opt out. */
  padTop?: boolean;
  /** Pads the bottom by the home-indicator inset, for screens without a tab bar or pinned footer. */
  padBottom?: boolean;
  /**
   * Reserves the space of the floating tab bar at the bottom. For screens that do not scroll;
   * scrolling screens put `useTabBarSpace()` on their content instead.
   */
  tabBar?: boolean;
  /** Override for screens that sit on dark imagery. */
  statusBar?: 'auto' | 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

/** Safe-area container on the theme background. */
export function Screen({
  children, background = 'bg', padTop = true, padBottom = false, tabBar = false, statusBar, style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottom = tabBar ? TAB_BAR_SPACE + insets.bottom : padBottom ? insets.bottom : 0;
  return (
    <View
      style={[
        styles.fill,
        { backgroundColor: colors[background], paddingTop: padTop ? insets.top : 0, paddingBottom: bottom },
        style,
      ]}>
      <FocusedStatusBar style={statusBar ?? (background === 'photo' ? 'light' : 'auto')} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
