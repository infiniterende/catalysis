import type { WeekDay } from '@catalysis/api';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { caps, useStyles, type ThemeColors } from '@/theme';

const DESCRIPTIONS: Record<WeekDay['state'], string> = {
  done: 'prayed',
  today: 'today',
  missed: 'not prayed',
  future: 'to come',
};

export interface WeekBarsProps {
  /** From `buildWeek(logs, today, ruleSize)`: seven days, Monday first. */
  week: WeekDay[];
  /** Short bars without day letters, for the Home streak card. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Seven-day tracker for an accent card (it draws in `onA`): a prayed day is
 * solid, today is outlined (and fills once a prayer is logged), the rest are recessed.
 */
export function WeekBars({ week, compact = false, style }: WeekBarsProps) {
  const styles = useStyles(themed);
  const prayed = week.filter((day) => day.state === 'done' || (day.state === 'today' && day.progress > 0)).length;

  return (
    <View
      accessible={compact}
      accessibilityLabel={compact ? `${prayed} of 7 days prayed this week` : undefined}
      style={[styles.row, compact && styles.rowCompact, style]}>
      {week.map((day) => {
        const today = day.state === 'today';
        return (
          <View
            key={day.date}
            accessible={!compact}
            accessibilityLabel={`${day.short}, ${today && day.progress > 0 ? 'today, prayed' : DESCRIPTIONS[day.state]}`}
            style={styles.day}>
            <View
              style={[
                styles.bar,
                compact && styles.barCompact,
                day.state === 'done' && styles.done,
                today && (day.progress > 0 ? styles.todayDone : styles.today),
              ]}
            />
            {compact ? null : <Text style={styles.letter}>{day.letter}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 6 },
    rowCompact: { gap: 4 },
    day: { flex: 1, alignItems: 'stretch' },
    bar: { height: 30, borderRadius: 9, backgroundColor: c.accentShade },
    barCompact: { height: 10, borderRadius: 4 },
    done: { backgroundColor: c.onA },
    today: { backgroundColor: c.accentWash, borderWidth: 2, borderColor: c.onA },
    todayDone: { backgroundColor: c.onA },
    letter: { ...caps(9), color: c.onA, textAlign: 'center', marginTop: 5 },
  });
