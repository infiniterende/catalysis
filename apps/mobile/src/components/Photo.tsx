// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { Media } from '@catalysis/api';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { focusToPosition, mediaSource } from '@/lib/assets';
import { colors } from '@/theme';

interface ScrimProps {
  /** Opacity of black at the bottom edge. */
  strength?: number;
  /** Where the fade begins, 0 (top) to 1 (bottom). */
  from?: number;
  /** Where full strength is reached. */
  to?: number;
  style?: StyleProp<ViewStyle>;
}

/** Dark gradient behind any text set on an image. */
export function Scrim({ strength = 0.82, from = 0, to = 1, style }: ScrimProps) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0)', `rgba(0,0,0,${strength})`]}
      locations={[from, to]}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}

interface PlaceholderProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The design's `.ph` tile for media that has no image yet. The original is an
 * off-centre radial gradient; two crossed linear gradients give the same
 * lit-from-upper-right falloff without an SVG per tile.
 */
export function Placeholder({ children, style }: PlaceholderProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#0c0c0c', '#3a3937', '#74726e', '#2e2d2b', '#0c0c0c']}
        locations={[0, 0.2, 0.4, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12,12,12,0.92)', 'rgba(12,12,12,0.25)', 'rgba(12,12,12,0)', 'rgba(12,12,12,0.7)']}
        locations={[0, 0.38, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

interface PhotoProps {
  media: Media | undefined;
  /** Drawn over the image: scrims, captions, icons. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Full-bleed image honouring the media's focal point; falls back to the placeholder tile. */
export function Photo({ media, children, style, accessibilityLabel }: PhotoProps) {
  const source = mediaSource(media);
  if (!source) return <Placeholder style={style}>{children}</Placeholder>;
  return (
    <View style={[styles.photo, style]}>
      <Image
        source={source}
        contentFit="cover"
        contentPosition={focusToPosition(media?.focus)}
        transition={150}
        accessibilityLabel={accessibilityLabel}
        accessible={Boolean(accessibilityLabel)}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { overflow: 'hidden', backgroundColor: colors.black },
  placeholder: { overflow: 'hidden', backgroundColor: '#0c0c0c' },
});
