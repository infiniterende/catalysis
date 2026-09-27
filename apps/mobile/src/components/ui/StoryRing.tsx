import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, useStyles, type ThemeColors } from '@/theme';

import { Touchable } from './Touchable';

/** Ring and gap are 3px each, so the content is `size - 12` across. */
export const STORY_RING_INSET = 12;

export interface StoryRingProps {
  /** The picture: an `Avatar` or `Photo` of `size - STORY_RING_INSET`. */
  children: ReactNode;
  /** Seen stories take a `line` ring; unseen ones take `a1`. */
  seen?: boolean;
  size?: number;
  /** Handle under the ring. */
  label?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function StoryRing({
  children, seen = false, size = 62, label, onPress, accessibilityLabel, style,
}: StoryRingProps) {
  const styles = useStyles(themed);
  const ring = (
    <>
      <View
        style={[
          styles.ring,
          seen ? styles.seen : styles.unseen,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        <View style={[styles.gap, { borderRadius: size / 2 }]}>{children}</View>
      </View>
      {label ? <Text numberOfLines={1} style={[styles.label, { maxWidth: size + 8 }]}>{label}</Text> : null}
    </>
  );

  if (!onPress) return <View style={[styles.item, style]}>{ring}</View>;
  return (
    <Touchable
      onPress={onPress}
      hitSlop={undefined}
      pressedOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={seen ? 'Seen' : 'New'}
      style={[styles.item, style]}>
      {ring}
    </Touchable>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    item: { alignItems: 'center' },
    ring: { padding: 3 },
    unseen: { backgroundColor: c.a1 },
    seen: { backgroundColor: c.line },
    gap: {
      flex: 1,
      borderWidth: 3,
      borderColor: c.bg,
      backgroundColor: c.bg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...body(11, 'semibold'), color: c.ink, marginTop: 5 },
  });
