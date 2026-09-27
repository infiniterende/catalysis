import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, isTone, radii, useTheme, type ThemeColors, type Tone } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Touchable } from './Touchable';
import { usePress, type PressTarget } from './usePress';

export type ChipTone =
  | Tone
  /** `btn` / `btnText`: the active filter. */
  | 'btn'
  | 'inset'
  /** White with navy text: on photographs and accent cards ("Feast day", "CCC 2838"). */
  | 'white'
  /** `onA` fill with white text: on accent cards. */
  | 'dark'
  /** 1.5px `line` border: suggested replies. */
  | 'line'
  /** Translucent white: on accent cards ("Best 31"). */
  | 'wash'
  /** Translucent black with white text: on photographs ("0:24"). */
  | 'glass';

export type ChipSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ChipSize, { font: number; padV: number; padH: number; weight: 'semibold' | 'bold' }> = {
  /** Tags: "Prayer request", "#testimony". */
  sm: { font: 11, padV: 5, padH: 10, weight: 'bold' },
  /** Actions: "I prayed · 24", "Add a verse". */
  md: { font: 13, padV: 8, padH: 13, weight: 'bold' },
  /** Filters: "For you", "Intentions". */
  lg: { font: 14, padV: 9, padH: 16, weight: 'semibold' },
};

function paint(c: ThemeColors, tone: ChipTone): { fill: string; ink: string; border?: string } {
  if (isTone(tone)) return { fill: c[tone], ink: c.onA };
  switch (tone) {
    case 'btn': return { fill: c.btn, ink: c.btnText };
    case 'inset': return { fill: c.inset, ink: c.ink };
    case 'white': return { fill: c.white, ink: c.onWhite };
    case 'dark': return { fill: c.onA, ink: c.white };
    case 'line': return { fill: 'transparent', ink: c.ink, border: c.line };
    case 'wash': return { fill: c.accentWash, ink: c.onA };
    case 'glass': return { fill: c.glass, ink: c.white };
  }
}

export interface ChipProps extends PressTarget {
  label: string;
  /** Fill when on (or always, for a chip that is not a toggle). Defaults to `inset`, or `btn` for a filter. */
  tone?: ChipTone;
  size?: ChipSize;
  icon?: IconName;
  /**
   * Makes the chip a toggle: on takes `tone` (`btn` by default), off takes `offTone` (`inset` by default).
   * Leave undefined for tags and plain actions.
   */
  selected?: boolean;
  /** Fill of a toggle that is off; set it when the chip sits on an accent card or a photograph. */
  offTone?: ChipTone;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Pill-shaped tag, action or filter. Without `onPress` / `href` it is a plain label. */
export function Chip({
  label, tone, offTone = 'inset', size = 'sm', icon, selected, onPress, href, accessibilityLabel, accessibilityHint, style,
}: ChipProps) {
  const { colors } = useTheme();
  const { press, role } = usePress({ onPress, href });
  const scale = SIZES[size];
  const active: ChipTone = selected === undefined ? tone ?? 'inset' : selected ? tone ?? 'btn' : offTone;
  const { fill, ink, border } = paint(colors, active);
  const borderWidth = border ? 1.5 : 0;

  const box = [
    styles.chip,
    {
      backgroundColor: fill,
      borderColor: border,
      borderWidth,
      paddingVertical: scale.padV - borderWidth,
      paddingHorizontal: scale.padH - borderWidth,
    },
    style,
  ];
  const content = (
    <>
      {icon ? <Icon name={icon} size={scale.font + 1} color={ink} /> : null}
      <Text numberOfLines={1} style={[body(scale.font, scale.weight, { lineHeight: 1.3 }), { color: ink }]}>
        {label}
      </Text>
    </>
  );

  if (!press) return <View style={box}>{content}</View>;
  return (
    <Touchable
      onPress={press}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      pressedOpacity={0.8}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={box}>
      {content}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.pill,
  },
});
