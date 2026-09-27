import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, surfaceColor, useStyles, useTheme, type Surface, type ThemeColors } from '@/theme';

import { Touchable } from './Touchable';
import { usePress, type PressTarget } from './usePress';

export interface CardProps extends PressTarget {
  children?: ReactNode;
  /** Fill. `card` carries the 1px `line` border; accents and `solid` do not. */
  surface?: Surface;
  radius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  /** Required when the card is pressable. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** Rounded surface. Text on an accent card is `onA`; on `solid` it is white (see `onSurface`). */
export function Card({
  children, surface = 'card', radius = radii.card, padding = 18, style,
  onPress, href, accessibilityLabel, accessibilityHint,
}: CardProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  const { press, role } = usePress({ onPress, href });
  const box = [
    styles.card,
    { backgroundColor: surfaceColor(colors, surface), borderRadius: radius, padding },
    surface === 'card' && styles.bordered,
    style,
  ];

  if (!press) return <View style={box}>{children}</View>;
  return (
    <Touchable
      onPress={press}
      hitSlop={undefined}
      pressedOpacity={0.85}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={box}>
      {children}
    </Touchable>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    card: { overflow: 'hidden' },
    bordered: { borderWidth: 1, borderColor: c.line },
  });
