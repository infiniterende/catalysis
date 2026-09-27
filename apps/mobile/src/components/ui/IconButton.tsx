import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { layout, shadows, useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Touchable } from './Touchable';
import { usePress, type PressTarget } from './usePress';

export type IconButtonVariant =
  /** `inset` circle, `ink` icon. */
  | 'inset'
  /** `btn` / `btnText`. */
  | 'primary'
  /** `a1` / `onA`: Lumen, send, like, the FAB. */
  | 'accent'
  /** `a2` / `onA`: "Going". */
  | 'highlight'
  /** Translucent black with a white icon, for use over photographs and video. */
  | 'glass'
  /** No fill: a bare `ink` icon with a 44pt target. */
  | 'plain';

function paint(c: ThemeColors, variant: IconButtonVariant): { fill: string; ink: string } {
  switch (variant) {
    case 'inset': return { fill: c.inset, ink: c.ink };
    case 'primary': return { fill: c.btn, ink: c.btnText };
    case 'accent': return { fill: c.a1, ink: c.onA };
    case 'highlight': return { fill: c.a2, ink: c.onA };
    case 'glass': return { fill: c.glassStrong, ink: c.white };
    case 'plain': return { fill: 'transparent', ink: c.ink };
  }
}

export interface IconButtonProps extends PressTarget {
  name: IconName;
  /** Read by screen readers; icon-only buttons have no visible text. */
  label: string;
  variant?: IconButtonVariant;
  /** Diameter: 44 by default, 42 in pushed-screen headers, 48 on the reels rail, 58 for the FAB. */
  size?: number;
  iconSize?: number;
  /** `rounded` is the soft square of the FAB and the camera's upload button. */
  shape?: 'circle' | 'rounded';
  /** Adds the floating shadow (FAB only). */
  elevated?: boolean;
  /** Solid icon, for the liked heart and the set bookmark. */
  filled?: boolean;
  /** Set for toggles so screen readers announce the state. */
  selected?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  name, label, variant = 'inset', size = 44, iconSize, shape = 'circle', elevated = false, filled, selected,
  disabled, onPress, href, accessibilityHint, style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const { press, role } = usePress({ onPress, href });
  const { fill, ink } = paint(colors, variant);
  const reach = Math.max(0, Math.ceil((layout.hitTarget - size) / 2));

  return (
    <Touchable
      onPress={press}
      disabled={disabled}
      hitSlop={reach}
      pressedOpacity={0.7}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), ...(selected === undefined ? null : { selected }) }}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : Math.round(size * 0.345),
          backgroundColor: fill,
        },
        elevated && styles.elevated,
        disabled && styles.disabled,
        style,
      ]}>
      <Icon name={name} size={iconSize ?? Math.round(size * 0.43)} color={ink} filled={filled} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  elevated: { boxShadow: shadows.fab },
  disabled: { opacity: 0.45 },
});
