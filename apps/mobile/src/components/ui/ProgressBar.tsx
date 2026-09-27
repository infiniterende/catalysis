import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, useTheme, type Tone } from '@/theme';

export interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  height?: number;
  /** Fill colour. */
  tone?: Tone;
  /** `inset` on neutral surfaces; `onAccent` when the bar sits on an accent card. */
  track?: 'inset' | 'onAccent';
  /** What is being measured, e.g. "Today's prayers". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value, height = 7, tone = 'a1', track = 'inset', accessibilityLabel, style,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[
        styles.track,
        { height, backgroundColor: track === 'inset' ? colors.inset : colors.accentShade },
        style,
      ]}>
      <View
        style={[
          styles.fill,
          { width: `${percent}%`, backgroundColor: track === 'inset' ? colors[tone] : colors.onA },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radii.pill, overflow: 'hidden', alignSelf: 'stretch' },
  fill: { height: '100%', borderRadius: radii.pill },
});
