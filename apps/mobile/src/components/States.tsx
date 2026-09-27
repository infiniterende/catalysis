// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, text } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Square `rule`-coloured block shown while content loads. */
export function Skeleton({ width = '100%', height = 14, style }: SkeletonProps) {
  return <View style={[styles.skeleton, { width, height }, style]} />;
}

const LINE_WIDTHS: DimensionValue[] = ['100%', '94%', '98%', '88%', '96%', '72%'];

/** A paragraph's worth of skeleton lines. */
export function SkeletonLines({ lines = 6, gap = 16, height = 14 }: { lines?: number; gap?: number; height?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={height} width={LINE_WIDTHS[i % LINE_WIDTHS.length]} />
      ))}
    </View>
  );
}

interface EmptyStateProps {
  children: string;
  /** A text link or button under the message. */
  action?: ReactNode;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ children, action, tone = 'light', align = 'center', style }: EmptyStateProps) {
  return (
    <View style={[styles.empty, align === 'center' && styles.emptyCentered, style]}>
      <Text
        style={[
          styles.emptyText,
          { color: tone === 'light' ? colors.muted : colors.onDarkMuted, textAlign: align },
        ]}>
        {children}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: colors.rule },
  empty: { paddingVertical: 36, paddingHorizontal: 22, gap: 16 },
  emptyCentered: { alignItems: 'center' },
  emptyText: { ...text(15, { italic: true, lineHeight: 1.5 }) },
});
