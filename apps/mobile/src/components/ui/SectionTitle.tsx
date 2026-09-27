import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, display, useStyles, type ThemeColors } from '@/theme';

export interface SectionTitleProps {
  children: string;
  /** Sits at the right on the title's baseline: a count ("3 of 4") or a link. */
  right?: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Heading above a list or a row of cards: "Today", "Guided", "Badges". */
export function SectionTitle({ children, right, size = 20, style }: SectionTitleProps) {
  const styles = useStyles(themed);
  return (
    <View style={[styles.row, style]}>
      <Text accessibilityRole="header" style={[styles.title, display(size, 'bold', { tracking: -0.02 })]}>
        {children}
      </Text>
      {typeof right === 'string' ? <Text style={styles.right}>{right}</Text> : right}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    // The design insets section titles 2px further than the cards under them.
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingTop: 20,
      paddingBottom: 10,
      paddingHorizontal: 2,
    },
    title: { color: c.ink, flexShrink: 1 },
    right: { ...body(14, 'bold'), color: c.ink },
  });
