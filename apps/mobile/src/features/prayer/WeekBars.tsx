import type { WeekDay } from '@catalysis/api';
import { StyleSheet, View } from 'react-native';

import { Label } from '@/components/Label';
import { colors, tracking } from '@/theme';

const BAR_HEIGHT = 38;

const DESCRIPTIONS: Record<WeekDay['state'], string> = {
  done: 'prayed',
  today: 'today',
  missed: 'not prayed',
  future: 'to come',
};

/** Seven-day tracker, Monday first. */
export function WeekBars({ week }: { week: WeekDay[] }) {
  return (
    <View style={styles.row}>
      {week.map((day) => {
        const today = day.state === 'today';
        return (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${day.short}, ${DESCRIPTIONS[day.state]}${today ? `, ${Math.round(day.progress * 100)} percent` : ''}`}
            style={styles.day}>
            <View
              style={[
                styles.bar,
                day.state === 'done' && styles.done,
                today && styles.today,
                (day.state === 'future' || day.state === 'missed') && styles.open,
              ]}>
              {today ? <View style={[styles.fill, { height: `${Math.round(day.progress * 100)}%` }]} /> : null}
            </View>
            <Label
              size={8}
              em={tracking.labelTiny}
              weight={today ? 'bold' : 'medium'}
              color={today ? colors.crimson : colors.muted}
              style={styles.letter}>
              {day.letter}
            </Label>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center' },
  bar: { height: BAR_HEIGHT, alignSelf: 'stretch', justifyContent: 'flex-end' },
  done: { backgroundColor: colors.ink },
  today: { borderWidth: 1.5, borderColor: colors.crimson },
  open: { borderWidth: 1, borderColor: colors.rule },
  fill: { backgroundColor: colors.crimson },
  letter: { marginTop: 6 },
});
