// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, display, onDark, tracking, trackingPx } from '@/theme';

interface MastheadProps {
  tone?: 'light' | 'dark';
  size?: number;
  /** Icon buttons either side of the wordmark (Today). Without them the wordmark is centred alone. */
  left?: ReactNode;
  right?: ReactNode;
}

export function Masthead({ tone = 'light', size = 20, left, right }: MastheadProps) {
  const color = tone === 'light' ? colors.ink : colors.white;
  const wordmark = (
    <Text
      accessibilityRole="header"
      style={[display(size), styles.wordmark, { color, letterSpacing: trackingPx(size, tracking.mastheadMobile) }]}>
      CATALYSIS
    </Text>
  );
  const rule = { borderBottomColor: tone === 'light' ? colors.ink : onDark.rule };

  if (left || right) {
    return (
      <View style={[styles.bar, rule]}>
        <View style={styles.side}>{left}</View>
        {wordmark}
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    );
  }
  return <View style={[styles.centered, rule]}>{wordmark}</View>;
}

const styles = StyleSheet.create({
  // Letter-spacing trails the last letter, so the wordmark is nudged right to sit optically centred.
  wordmark: { paddingLeft: 7, textAlign: 'center' },
  centered: { alignItems: 'center', paddingTop: 6, paddingBottom: 14, borderBottomWidth: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 13,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  side: { width: 44, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
});

interface HeaderBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  tone?: 'light' | 'dark';
  padH?: number;
}

/** The pushed screens' header: back chevron, centred title block, actions. */
export function HeaderBar({ left, center, right, tone = 'light', padH = 20 }: HeaderBarProps) {
  return (
    <View
      style={[
        headerStyles.bar,
        { paddingHorizontal: padH, borderBottomColor: tone === 'light' ? colors.ink : 'transparent' },
      ]}>
      <View style={headerStyles.side}>{left}</View>
      <View style={headerStyles.center}>{center}</View>
      <View style={[headerStyles.side, headerStyles.right]}>{right}</View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  side: { minWidth: 56, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end', gap: 14 },
  center: { flex: 1, alignItems: 'center' },
});
