import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { HIT_SLOP } from '@/theme';

export interface TouchableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Opacity while pressed. */
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
