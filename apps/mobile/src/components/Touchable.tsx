// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, HIT_SLOP } from '@/theme';

import { Icon, type IconName } from './Icon';

interface TouchableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Opacity while pressed. Text actions dim to 0.6. */
  pressedOpacity?: number;
}

/** A `Pressable` with the app's pressed feedback and a 44pt-friendly hit area. */
export function Touchable({ style, children, pressedOpacity = 0.6, disabled, ...rest }: TouchableProps) {
  return (
    <Pressable
      hitSlop={HIT_SLOP}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: pressedOpacity } : null]}>
      {children}
    </Pressable>
  );
}

interface IconButtonProps {
  name: IconName;
  /** Read by screen readers; icon-only buttons have no visible text. */
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
  filled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ name, label, onPress, size = 19, color = colors.ink, filled, selected, style }: IconButtonProps) {
  return (
    <Touchable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}>
      <Icon name={name} size={size} color={color} filled={filled} />
    </Touchable>
  );
}
