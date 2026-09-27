import type { Media } from '@catalysis/api';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { focusToPosition, mediaSource } from '@/lib/assets';
import { fixed } from '@/theme';

export interface ScrimProps {
  /** Opacity of black at the bottom edge. */
  strength?: number;
  /** Where the fade begins, 0 (top) to 1 (bottom). */
  from?: number;
  /** Where full strength is reached. */
  to?: number;
  style?: StyleProp<ViewStyle>;
}

/** Dark gradient behind any text set on an image. */
export function Scrim({ strength = 0.82, from = 0.25, to = 1, style }: ScrimProps) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0)', `rgba(0,0,0,${strength})`]}
      locations={[from, to]}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}

export interface PlaceholderProps {
  children?: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Tile for media that has no image yet: the photo backdrop, lit from the upper right. */
export function Placeholder({ children, radius = 0, style }: PlaceholderProps) {
  return (
    <View style={[styles.photo, { borderRadius: radius }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export interface PhotoProps {
  media: Media | undefined;
  /** Drawn over the image: scrims, captions, icons. */
  children?: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Without a label the image is decorative and hidden from screen readers. */
  accessibilityLabel?: string;
}

/** Image honouring the media's focal point; falls back to the placeholder tile. */
export function Photo({ media, children, radius = 0, style, accessibilityLabel }: PhotoProps) {
  const source = mediaSource(media);
  if (!source) return <Placeholder radius={radius} style={style}>{children}</Placeholder>;
  return (
    <View style={[styles.photo, { borderRadius: radius }, style]}>
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
  photo: { overflow: 'hidden', backgroundColor: fixed.photo },
});
