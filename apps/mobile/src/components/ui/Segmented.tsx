import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, radii, shadows, useStyles, type ThemeColors } from '@/theme';

import { Touchable } from './Touchable';

export interface SegmentedOption<K extends string> {
  key: K;
  label: string;
}

export interface SegmentedProps<K extends string> {
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** `card`: the active segment is `card` with a shadow (Login). `btn`: it is `btn` (Reels, Create). */
  variant?: 'card' | 'btn';
  /** `md` fills the width with equal segments; `sm` hugs its labels (the Reels header). */
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Segmented<K extends string>({
  options, value, onChange, variant = 'card', size = 'md', accessibilityLabel, style,
}: SegmentedProps<K>) {
  const styles = useStyles(themed);
  const small = size === 'sm';
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, small ? styles.trackSmall : styles.trackFull, style]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Touchable
            key={option.key}
            onPress={() => onChange(option.key)}
            hitSlop={{ top: 8, bottom: 8 }}
            pressedOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              small ? styles.segmentSmall : styles.segmentFull,
              active && (variant === 'card' ? styles.activeCard : styles.activeBtn),
            ]}>
            <Text
              numberOfLines={1}
              style={[
                small ? styles.labelSmall : styles.label,
                active && (variant === 'card' ? styles.labelOnCard : styles.labelOnBtn),
              ]}>
              {option.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    track: { flexDirection: 'row', backgroundColor: c.inset, borderRadius: radii.pill },
    trackFull: { alignSelf: 'stretch', padding: 5 },
    trackSmall: { alignSelf: 'flex-start', padding: 4 },
    segment: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
    segmentFull: { flex: 1, paddingVertical: 11, paddingHorizontal: 8 },
    segmentSmall: { paddingVertical: 8, paddingHorizontal: 13 },
    activeCard: { backgroundColor: c.card, boxShadow: shadows.segment },
    activeBtn: { backgroundColor: c.btn },
    label: { ...body(15, 'semibold', { lineHeight: 1.3 }), color: c.subtle },
    labelSmall: { ...body(13, 'semibold', { lineHeight: 1.3 }), color: c.subtle },
    labelOnCard: { color: c.ink },
    labelOnBtn: { color: c.btnText },
  });
