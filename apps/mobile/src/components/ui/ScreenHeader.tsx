import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, display, layout, useStyles, type ThemeColors } from '@/theme';

import { IconButton, type IconButtonVariant } from './IconButton';

export interface ScreenHeaderProps {
  /**
   * Without `back` this is the tab screens' large title ("Prayer", "Community").
   * With `back` it is set small beside the button.
   */
  title?: string;
  /** Size of the large title: 40 Prayer, 36 Community / Discover, 30 Reels. */
  titleSize?: number;
  /** Small line under a compact title. */
  subtitle?: string;
  /** Shows the back button. Pass a function to replace the default `router.back()`. */
  back?: boolean | (() => void);
  /** `glass` when the header lies over a photograph. */
  backVariant?: IconButtonVariant;
  /** Between the back button and the title (Lumen's orb). */
  leading?: ReactNode;
  /** Centred in place of a title (the reader's book picker). */
  center?: ReactNode;
  /** Right-hand controls; several are spaced 8 apart. */
  actions?: ReactNode;
  /** Hairline under the header (Lumen). */
  divider?: boolean;
  padH?: number;
  style?: StyleProp<ViewStyle>;
}

/** Top row of a screen: back button, title, actions. Place it inside `Screen`, which pads for the status bar. */
export function ScreenHeader({
  title, titleSize = 36, subtitle, back = false, backVariant = 'inset', leading, center, actions,
  divider = false, padH = layout.screen, style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const styles = useStyles(themed);
  const goBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  const large = !back && !leading && !center;

  return (
    <View style={[styles.bar, { paddingHorizontal: padH }, divider && styles.divider, style]}>
      {back ? (
        <IconButton name="chevron-left" label="Back" variant={backVariant} size={42} iconSize={20} onPress={goBack} />
      ) : null}
      {leading}
      {center ? (
        <View style={styles.center}>{center}</View>
      ) : (
        <View style={styles.titles}>
          {title ? (
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[
                styles.title,
                large
                  ? display(titleSize, 'extrabold', { tracking: -0.04, lineHeight: 1.15 })
                  : display(20, 'bold', { lineHeight: 1.1 }),
              ]}>
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, minHeight: 52 },
    divider: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.line },
    center: { flex: 1, alignItems: 'center' },
    titles: { flex: 1 },
    title: { color: c.ink },
    subtitle: { ...body(12), color: c.muted, marginTop: 3 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
