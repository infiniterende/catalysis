import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, useStyles, type ThemeColors } from '@/theme';

import { Touchable } from './Touchable';

export interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** What the switch controls, e.g. "Prayer reminders". */
  label: string;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** 50 × 30 toggle: `btn` track with a `btnText` knob when on, `inset` when off. */
export function Switch({ value, onChange, label, disabled, accessibilityHint, style }: SwitchProps) {
  const styles = useStyles(themed);
  return (
    <Touchable
      onPress={() => onChange(!value)}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      pressedOpacity={0.8}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      style={[styles.track, value ? styles.on : styles.off, disabled && styles.disabled, style]}>
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Touchable>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    track: { width: 50, height: 30, borderRadius: radii.pill, padding: 3, justifyContent: 'center' },
    on: { backgroundColor: c.btn, alignItems: 'flex-end' },
    off: { backgroundColor: c.inset, borderWidth: 1, borderColor: c.line, padding: 2, alignItems: 'flex-start' },
    knob: { width: 24, height: 24, borderRadius: 12 },
    knobOn: { backgroundColor: c.btnText },
    knobOff: { backgroundColor: c.subtle },
    disabled: { opacity: 0.45 },
  });
