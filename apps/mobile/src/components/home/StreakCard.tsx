import type { WeekDay } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Icon, WeekBars } from '@/components/ui';
import { body, display, useStyles, useTheme, type ThemeColors } from '@/theme';

export const BENTO_HEIGHT = 150;

export interface StreakCardProps {
  /** From `computeStreak`. */
  streak: number;
  /** From `buildWeek`. */
  week: WeekDay[];
  onPress: () => void;
}

/** Home's streak tile, on `a2`. Opens Prayer. */
export function StreakCard({ streak, week, onPress }: StreakCardProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  return (
    <Card
      surface="a2"
      radius={26}
      onPress={onPress}
      accessibilityLabel={`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
      accessibilityHint="Opens Prayer"
      style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>Streak</Text>
        <Icon name="flame" size={18} color={colors.onA} />
      </View>
      <View>
        <View style={styles.count}>
          <Text style={styles.number}>{streak}</Text>
          <Text style={styles.unit}>{streak === 1 ? 'day' : 'days'}</Text>
        </View>
        <WeekBars week={week} compact style={styles.week} />
      </View>
    </Card>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    card: { flex: 1, minHeight: BENTO_HEIGHT, justifyContent: 'space-between' },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { ...body(13, 'bold'), color: c.onA },
    count: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    // The design's 0.8 line box would clip the numerals on Android; the glyphs sit the same at 0.9.
    number: { ...display(62, 'extrabold', { lineHeight: 0.9, tracking: -0.05 }), color: c.onA },
    unit: { ...body(13, 'semibold'), color: c.onA },
    week: { marginTop: 8 },
  });
