// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

import { colors, label as labelStyle, tracking, type LabelWeight } from '@/theme';

interface LabelProps extends Omit<TextProps, 'style'> {
  children: ReactNode;
  size?: number;
  weight?: LabelWeight;
  color?: string;
  /** Letter-spacing in em; the design tightens it on tiny labels. */
  em?: number;
  style?: StyleProp<TextStyle>;
}

/** Hanken Grotesk caps: the app's UI label. */
export function Label({ children, size = 10, weight = 'medium', color = colors.ink, em = tracking.label, style, ...rest }: LabelProps) {
  return (
    <Text {...rest} style={[labelStyle(size, weight, em), { color }, style]}>
      {children}
    </Text>
  );
}

interface TagProps {
  children: string;
  size?: number;
  padV?: number;
  padH?: number;
  style?: StyleProp<ViewStyle>;
}

/** Crimson label box: "Verse of the day", "Prayer request", "Tonight". */
export function Tag({ children, size = 9, padV = 5, padH = 9, style }: TagProps) {
  return (
    <View style={[styles.tag, { paddingVertical: padV, paddingHorizontal: padH }, style]}>
      <Label size={size} color={colors.white}>{children}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { backgroundColor: colors.crimson, alignSelf: 'flex-start' },
});
