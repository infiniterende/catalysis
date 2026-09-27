// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, HIT_SLOP, onDark } from '@/theme';

import { Label } from './Label';
import { Touchable } from './Touchable';

type Tone = 'light' | 'dark';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `dark` is the variant drawn on black or on photos. */
  tone?: Tone;
  disabled?: boolean;
  busy?: boolean;
  padV?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Ink block with paper caps; on dark, a paper block with black caps. */
export function PrimaryButton({ label, onPress, tone = 'light', disabled, busy, padV = 18, size = 11, style, accessibilityHint }: ButtonProps) {
  const fill = tone === 'light' ? colors.ink : colors.paper;
  const ink = tone === 'light' ? colors.paper : colors.black;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      style={({ pressed }) => [
        styles.block,
        { backgroundColor: fill, paddingVertical: padV },
        pressed && styles.pressed,
        (disabled || busy) && styles.disabled,
        style,
      ]}>
      <Label size={size} weight="semibold" color={ink} style={styles.centered}>{label}</Label>
    </Pressable>
  );
}

/** 1px outline; fills with ink while pressed, as the web build does on hover. */
export function OutlineButton({ label, onPress, tone = 'light', disabled, padV = 16, size = 11, style, accessibilityHint }: ButtonProps) {
  const line = tone === 'light' ? colors.ink : onDark.outline;
  const ink = tone === 'light' ? colors.ink : colors.white;
  const pressedFill = tone === 'light' ? colors.ink : colors.paper;
  const pressedInk = tone === 'light' ? colors.paper : colors.black;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.block,
        styles.outline,
        { borderColor: line, paddingVertical: padV },
        pressed && { backgroundColor: pressedFill },
        disabled && styles.disabled,
        style,
      ]}>
      {({ pressed }) => (
        <Label size={size} weight="semibold" color={pressed ? pressedInk : ink} style={styles.centered}>{label}</Label>
      )}
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  onPress: () => void;
  /** Solid when on ("Going", "Following"), outlined when off ("RSVP", "Follow"). */
  filled?: boolean;
  tone?: Tone;
  size?: number;
  padV?: number;
  padH?: number;
  /** Set for toggles so screen readers announce the state. */
  selected?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small caps box: RSVP, Follow, suggested replies, Create Post options.
 * Padding excludes the 1px border, as in the design's CSS.
 */
export function Chip({ label, onPress, filled = false, tone = 'light', size = 8.5, padV = 7, padH = 11, selected, accessibilityLabel, style }: ChipProps) {
  const solid = tone === 'light' ? colors.ink : colors.white;
  const line = tone === 'light' ? colors.ink : onDark.outlineSoft;
  const ink = filled ? (tone === 'light' ? colors.white : colors.black) : tone === 'light' ? colors.ink : colors.white;
  return (
    <Touchable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={[
        styles.chip,
        { paddingVertical: padV, paddingHorizontal: padH, borderColor: filled ? solid : line },
        filled && { backgroundColor: solid },
        style,
      ]}>
      <Label size={size} color={ink}>{label}</Label>
    </Touchable>
  );
}

interface TextLinkProps {
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Caps with a 1px underline: "Reflect", "Try again". */
export function TextLink({ label, onPress, color = colors.ink, size = 9, style }: TextLinkProps) {
  return (
    <Touchable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={[styles.link, style]}>
      <View style={[styles.linkInner, { borderBottomColor: color }]}>
        <Label size={size} color={color}>{label}</Label>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  outline: { borderWidth: 1 },
  centered: { textAlign: 'center' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  chip: { borderWidth: 1, alignSelf: 'flex-start' },
  link: { alignSelf: 'flex-start' },
  linkInner: { borderBottomWidth: 1, paddingBottom: 2 },
});
