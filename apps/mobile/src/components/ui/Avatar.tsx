import type { Media } from '@catalysis/api';
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { display, toneFor, useTheme, type DisplayWeight, type Tone } from '@/theme';

import { Photo } from './Photo';

export function initialsOf(name: string, letters: 1 | 2 = 2): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, letters).map((word) => word[0]?.toUpperCase() ?? '').join('');
}

export interface AvatarProps {
  /** Gives the initials, the default tone and the screen-reader label. */
  name: string;
  /** A portrait: bundled media or a URL. Without one the initials are shown. */
  source?: Media | string;
  size?: number;
  /** `rounded` is the soft square of the profile tile. */
  shape?: 'circle' | 'rounded';
  /** Fill behind the initials; by default a tint picked from the name. */
  tone?: Tone;
  letters?: 1 | 2;
  weight?: DisplayWeight;
  /** Avatars beside a name are decorative: pass `false` to hide them from screen readers. */
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  name, source, size = 44, shape = 'circle', tone, letters = 2, weight = 'bold', accessible = true, style,
}: AvatarProps) {
  const { colors } = useTheme();
  const borderRadius = shape === 'circle' ? size / 2 : Math.round(size * 0.33);
  const box = { width: size, height: size, borderRadius };
  const a11y = accessible
    ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: name } as const)
    : ({ accessible: false, importantForAccessibility: 'no-hide-descendants' } as const);

  if (typeof source === 'string') {
    return (
      <View {...a11y} style={[styles.clip, box, { backgroundColor: colors.photo }, style]}>
        <Image source={{ uri: source }} contentFit="cover" transition={150} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  if (source) {
    return (
      <View {...a11y} style={[box, style]}>
        <Photo media={source} radius={borderRadius} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  return (
    <View {...a11y} style={[styles.initials, box, { backgroundColor: colors[tone ?? toneFor(name)] }, style]}>
      <Text style={[display(Math.round(size * 0.4), weight), { color: colors.onA }]}>
        {initialsOf(name, letters)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  initials: { alignItems: 'center', justifyContent: 'center' },
});
