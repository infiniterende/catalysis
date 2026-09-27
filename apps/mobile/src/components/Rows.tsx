// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, display, text } from '@/theme';

import { Label } from './Label';
import { Touchable } from './Touchable';

interface RuleProps {
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Hairline. Section tops are ink; rows inside use `rule`. */
export function Rule({ color = colors.rule, style }: RuleProps) {
  return <View style={[styles.rule, { backgroundColor: color }, style]} />;
}

interface NumberedRowProps {
  numeral: string;
  title: string;
  /** Second line under the title, Caslon italic. */
  detail?: string;
  /** Right-aligned caps, or any node (a chip, a time box). */
  meta?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  numeralSize?: number;
  numeralWidth?: number;
  numeralColor?: string;
  titleStyle?: StyleProp<TextStyle>;
  metaColor?: string;
  align?: 'center' | 'baseline';
  padV?: number;
  gap?: number;
  borderColor?: string | null;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** Crimson Bodoni numeral, Caslon title, right-aligned caps meta. */
export function NumberedRow({
  numeral, title, detail, meta, onPress, onLongPress,
  numeralSize = 20, numeralWidth = 26, numeralColor = colors.crimson,
  titleStyle, metaColor = colors.subtle, align = 'baseline', padV = 10, gap = 14,
  borderColor = colors.rule, accessibilityLabel, accessibilityHint,
}: NumberedRowProps) {
  const body = (
    <View
      style={[
        styles.row,
        { alignItems: align, paddingVertical: padV, gap },
        borderColor ? { borderBottomWidth: 1, borderBottomColor: borderColor } : null,
      ]}>
      <Text style={[display(numeralSize), { color: numeralColor, width: numeralWidth }]}>{numeral}</Text>
      <View style={styles.body}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {typeof meta === 'string' ? <Label size={8} color={metaColor}>{meta}</Label> : meta}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Touchable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}>
      {body}
    </Touchable>
  );
}

interface DisclosureRowProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** "Saved verses & notes ›" */
export function DisclosureRow({ label, onPress, style }: DisclosureRowProps) {
  return (
    <Touchable onPress={onPress} hitSlop={undefined} accessibilityRole="button" accessibilityLabel={label} style={[styles.disclosure, style]}>
      <Label>{label}</Label>
      <Label>›</Label>
    </Touchable>
  );
}

interface SectionHeadingProps {
  children: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Semibold caps heading above a list: "Today", "Guided", "Milestones". */
export function SectionHeading({ children, right, style }: SectionHeadingProps) {
  return (
    <View style={[styles.heading, style]}>
      <Label weight="semibold" accessibilityRole="header">{children}</Label>
      {right}
    </View>
  );
}

interface StatProps {
  value: string;
  label: string;
  accent?: boolean;
}

interface StatGridProps {
  stats: [StatProps, StatProps, StatProps];
  numeralSize?: number;
  style?: StyleProp<ViewStyle>;
}

/** Three stats between ink rules (Prayer, Profile). */
export function StatGrid({ stats, numeralSize = 32, style }: StatGridProps) {
  return (
    <View style={[styles.stats, style]}>
      {stats.map((stat, i) => (
        <View
          key={stat.label}
          accessible
          accessibilityLabel={`${stat.label}: ${stat.value}`}
          style={[styles.stat, i === 1 && styles.statMiddle]}>
          <Text style={[display(numeralSize, { lineHeight: 1 }), styles.statValue, { color: stat.accent ? colors.crimson : colors.ink }]}>
            {stat.value}
          </Text>
          <Label size={8} color={colors.muted} style={styles.statLabel}>{stat.label}</Label>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: 1, alignSelf: 'stretch' },
  row: { flexDirection: 'row' },
  body: { flex: 1 },
  title: { ...text(15), color: colors.ink },
  detail: { ...text(13, { italic: true, lineHeight: 1.45 }), color: colors.muted, marginTop: 3 },
  disclosure: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.ink,
  },
  stat: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.rule },
  // Bodoni's numerals sit low in a tight line box; a little headroom stops Android clipping them.
  statValue: { paddingTop: 2 },
  statLabel: { marginTop: 6 },
});
