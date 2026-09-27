import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Touchable } from './Touchable';
import { usePress, type PressTarget } from './usePress';

export interface ListRowProps extends PressTarget {
  label: string;
  icon?: IconName;
  /** Muted text at the right ("Everyone", "Light"). */
  value?: string;
  /** Replaces the chevron: a `Switch`, a `Segmented`, a `Chip`. */
  right?: ReactNode;
  /** Hairline under the row; leave off for the last row of a group. */
  divider?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** A row in a settings list (Profile, Create Post's Audience). Group rows in a `Card` with `padding={0}`. */
export function ListRow({
  label, icon, value, right, divider = false, destructive = false, onPress, href, accessibilityHint, style,
}: ListRowProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  const { press, role } = usePress({ onPress, href });
  const ink = destructive ? colors.a1 : colors.ink;

  const content = (
    <>
      {icon ? <Icon name={icon} size={19} color={ink} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: ink }]}>{label}</Text>
      {value ? <Text numberOfLines={1} style={styles.value}>{value}</Text> : null}
      {right ?? (press ? <Icon name="chevron-right" size={16} color={colors.subtle} /> : null)}
    </>
  );
  const box = [styles.row, divider && styles.divider, style];

  if (!press) return <View style={box}>{content}</View>;
  return (
    <Touchable
      onPress={press}
      hitSlop={undefined}
      pressedOpacity={0.7}
      accessibilityRole={role}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      style={box}>
      {content}
    </Touchable>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 15, paddingHorizontal: 16 },
    divider: { borderBottomWidth: 1, borderBottomColor: c.line },
    label: { ...body(15, 'semibold'), flex: 1 },
    value: { ...body(13), color: c.muted, flexShrink: 1 },
  });
