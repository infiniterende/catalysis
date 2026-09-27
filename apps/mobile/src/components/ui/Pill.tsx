import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { body, radii, useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { usePress, type PressTarget } from './usePress';

export type PillVariant =
  /** `btn` / `btnText`: the primary action. */
  | 'primary'
  /** `a1`: Lumen, Explain, Start. */
  | 'accent'
  /** `a2`: Reflect, Next, "I prayed". */
  | 'highlight'
  /** `onA` fill with white text, for use on an accent surface. */
  | 'dark'
  /** White, for use on photographs and accent surfaces. */
  | 'white'
  /** 1.5px `line` border, `ink` text: the secondary action. */
  | 'ghost'
  /** `inset` fill, `ink` text. */
  | 'inset'
  /** Outlined in translucent white, for use on `solid`. */
  | 'onSolid';

export type PillSize = 'sm' | 'md' | 'lg';

const SIZES: Record<PillSize, { font: number; padV: number; padH: number; icon: number; gap: number }> = {
  sm: { font: 13, padV: 8, padH: 14, icon: 14, gap: 6 },
  md: { font: 14, padV: 10, padH: 18, icon: 15, gap: 6 },
  lg: { font: 16, padV: 17, padH: 22, icon: 18, gap: 8 },
};

function paint(c: ThemeColors, variant: PillVariant): { fill: string; ink: string; border?: string; borderWidth?: number } {
  switch (variant) {
    case 'primary': return { fill: c.btn, ink: c.btnText };
    case 'accent': return { fill: c.a1, ink: c.onA };
    case 'highlight': return { fill: c.a2, ink: c.onA };
    case 'dark': return { fill: c.onA, ink: c.white };
    case 'white': return { fill: c.white, ink: c.onWhite };
    case 'inset': return { fill: c.inset, ink: c.ink };
    case 'ghost': return { fill: 'transparent', ink: c.ink, border: c.line, borderWidth: 1.5 };
    case 'onSolid': return { fill: 'transparent', ink: c.white, border: c.onSolidLine, borderWidth: 1 };
  }
}

export interface PillProps extends PressTarget {
  label: string;
  variant?: PillVariant;
  size?: PillSize;
  /** Leading icon. */
  icon?: IconName;
  trailingIcon?: IconName;
  /** Stretches to the width of its container; otherwise the pill hugs its label. */
  full?: boolean;
  disabled?: boolean;
  /** Blocks presses and announces "busy" while a request is in flight. */
  busy?: boolean;
  /** Set for toggles ("Going", "Following") so screen readers announce the state. */
  selected?: boolean;
  /** Overrides for the few pills the frames size off the scale. */
  fontSize?: number;
  padV?: number;
  padH?: number;
  weight?: 'semibold' | 'bold';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** The pill button. With `href` it is a link. */
export function Pill({
  label, variant = 'primary', size = 'md', icon, trailingIcon, full = false, disabled = false, busy = false,
  selected, fontSize, padV, padH, weight, onPress, href, accessibilityLabel, accessibilityHint, style,
}: PillProps) {
  const { colors } = useTheme();
  const { press, role } = usePress({ onPress, href });
  const scale = SIZES[size];
  const { fill, ink, border, borderWidth = 0 } = paint(colors, variant);
  const font = fontSize ?? scale.font;
  const outlined = variant === 'ghost' || variant === 'onSolid' || variant === 'inset';
  const blocked = disabled || busy;
  // Small pills are shorter than 44pt; the slop makes up the difference.
  const slop = size === 'lg' ? undefined : { top: 8, bottom: 8, left: 4, right: 4 };

  return (
    <Pressable
      onPress={press}
      disabled={blocked}
      hitSlop={slop}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy, ...(selected === undefined ? null : { selected }) }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: fill,
          borderColor: border,
          borderWidth,
          gap: scale.gap,
          // Padding excludes the border, as in the design's CSS.
          paddingVertical: (padV ?? scale.padV) - borderWidth,
          paddingHorizontal: (padH ?? scale.padH) - borderWidth,
        },
        full ? styles.full : styles.hug,
        pressed && styles.pressed,
        blocked && styles.disabled,
        style,
      ]}>
      {icon ? <Icon name={icon} size={scale.icon} color={ink} /> : null}
      <Text
        numberOfLines={1}
        style={[body(font, weight ?? (outlined ? 'semibold' : 'bold'), { lineHeight: 1.3 }), { color: ink }]}>
        {label}
      </Text>
      {trailingIcon ? <Icon name={trailingIcon} size={scale.icon} color={ink} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
