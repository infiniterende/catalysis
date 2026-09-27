import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, useStyles, type ThemeColors } from '@/theme';

export interface DividerProps {
  /** Set in the middle of the line ("or"). */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** 1px `line` rule. */
export function Divider({ label, style }: DividerProps) {
  const styles = useStyles(themed);
  if (!label) return <View style={[styles.line, styles.alone, style]} />;
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    line: { flex: 1, height: 1, backgroundColor: c.line },
    alone: { flex: 0, alignSelf: 'stretch' },
    label: { ...body(13), color: c.subtle },
  });
