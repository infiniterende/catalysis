import type { Media } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, Photo } from '@/components/ui';
import { body, caps, display, radii, shadows, useStyles, useTheme, type ThemeColors } from '@/theme';

const ANGEL: Media = { kind: 'image', asset: 'angel', focus: '50% 30%' };
const MONSTRANCE: Media = { kind: 'image', asset: 'monstrance', focus: '50% 42%' };

/** Welcome's tilted photographs with the streak and verse stickers. Decorative: hidden from screen readers. */
export function Collage() {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.collage}>
      {/* The shadow sits on a wrapper, because the photo clips to its rounded corners. */}
      <View style={[styles.tilted, styles.angel]}>
        <Photo media={ANGEL} radius={26} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[styles.tilted, styles.monstrance]}>
        <Photo media={MONSTRANCE} radius={24} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.streak}>
        <Icon name="flame" size={14} color={colors.onA} />
        <Text style={styles.streakText}>12-day streak</Text>
      </View>

      <View style={styles.verse}>
        <Text style={styles.verseLabel}>Verse of the day</Text>
        <Text style={styles.verseText}>The light shines in the darkness.</Text>
      </View>
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    collage: { height: 330, marginTop: 18 },
    tilted: { position: 'absolute', boxShadow: shadows.photo },
    angel: { left: 24, top: 10, width: 190, height: 260, borderRadius: 26, transform: [{ rotate: '-4deg' }] },
    monstrance: { right: 24, top: 40, width: 170, height: 230, borderRadius: 24, transform: [{ rotate: '5deg' }] },
    streak: {
      position: 'absolute',
      right: 30,
      top: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: c.a2,
      borderRadius: radii.pill,
      paddingVertical: 9,
      paddingHorizontal: 14,
      transform: [{ rotate: '6deg' }],
    },
    streakText: { ...body(14, 'bold', { lineHeight: 1.3 }), color: c.onA },
    verse: {
      position: 'absolute',
      left: 40,
      bottom: 0,
      width: 220,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      transform: [{ rotate: '2deg' }],
      boxShadow: shadows.sticker,
    },
    verseLabel: { ...caps(10), color: c.a1 },
    verseText: { ...display(19, 'medium', { lineHeight: 1.15 }), color: c.ink, marginTop: 6 },
  });
