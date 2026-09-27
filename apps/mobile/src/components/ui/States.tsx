import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { body, display, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** `inset` block shown while content loads. */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const styles = useStyles(themed);
  return <View style={[styles.skeleton, { width, height, borderRadius: radius }, style]} />;
}

const LINE_WIDTHS: DimensionValue[] = ['100%', '94%', '98%', '88%', '96%', '72%'];

export interface SkeletonLinesProps {
  lines?: number;
  gap?: number;
  height?: number;
}

/** A paragraph's worth of skeleton lines. */
export function SkeletonLines({ lines = 6, gap = 16, height = 14 }: SkeletonLinesProps) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={height} width={LINE_WIDTHS[i % LINE_WIDTHS.length]} />
      ))}
    </View>
  );
}

export interface EmptyStateProps {
  /** The message. */
  children: string;
  title?: string;
  /** Drawn in an `inset` circle above the text. */
  icon?: IconName;
  /** A `Pill` under the message. */
  action?: ReactNode;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

/** Shown where a list has nothing in it, or could not load. */
export function EmptyState({ children, title, icon, action, align = 'center', style }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  const centered = align === 'center';
  return (
    <View style={[styles.empty, centered && styles.centered, style]}>
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={22} color={colors.ink} />
        </View>
      ) : null}
      {title ? <Text style={[styles.title, centered && styles.textCentered]}>{title}</Text> : null}
      <Text style={[styles.message, centered && styles.textCentered]}>{children}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    skeleton: { backgroundColor: c.inset },
    empty: { paddingVertical: 32, paddingHorizontal: 24 },
    centered: { alignItems: 'center' },
    icon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.inset,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: { ...display(20, 'bold', { tracking: -0.02, lineHeight: 1.2 }), color: c.ink, marginBottom: 6 },
    message: { ...body(15, 'regular', { lineHeight: 1.5 }), color: c.muted },
    textCentered: { textAlign: 'center' },
    action: { marginTop: 16 },
  });
