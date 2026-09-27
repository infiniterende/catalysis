import { formatHour, formatTime24, type RuleRow } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Pill, PrayerRow, ProgressBar } from '@/components/ui';
import { body, display, useStyles, type ThemeColors } from '@/theme';

export interface PrayersCardProps {
  /** From `buildRule`: today's prayers in schedule order. */
  rule: RuleRow[];
  onToggle: (row: RuleRow) => void;
  /** Opens the guided prayer for a row that has one. */
  onStart: (guidedId: string) => void;
}

/** Home's "Today's prayers": count, progress bar, and a row per prayer. */
export function PrayersCard({ rule, onToggle, onStart }: PrayersCardProps) {
  const styles = useStyles(themed);
  const done = rule.filter((row) => row.done).length;

  return (
    <Card radius={26}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Today’s prayers</Text>
        {rule.length > 0 ? (
          <Text style={styles.count} accessibilityLabel={`${done} of ${rule.length} prayed`}>
            {done}/{rule.length}
          </Text>
        ) : null}
      </View>

      {rule.length === 0 ? (
        <EmptyState
          align="left"
          style={styles.empty}
          action={<Pill label="Add a prayer" size="sm" href="/prayer" />}>
          Your rule is empty. Add a prayer to begin your day with it.
        </EmptyState>
      ) : (
        <>
          <ProgressBar value={done / rule.length} accessibilityLabel="Today’s prayers" style={styles.progress} />
          <View style={styles.rows}>
            {rule.map((row) => (
              <PrayerItem key={row.prayer.id} row={row} onToggle={onToggle} onStart={onStart} />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

interface PrayerItemProps {
  row: RuleRow;
  onToggle: (row: RuleRow) => void;
  onStart: (guidedId: string) => void;
}

function PrayerItem({ row, onToggle, onStart }: PrayerItemProps) {
  const { prayer, log, done, next } = row;
  const title = prayer.shortTitle ?? prayer.title;
  const guidedId = prayer.guidedContentId;
  const time = log ? formatTime24(new Date(log.completedAt)) : formatHour(prayer.scheduledTime);

  return (
    <PrayerRow
      compact
      title={title}
      done={done}
      next={next}
      meta={time}
      // The next prayer offers its guided version; the row itself still ticks it off.
      action={
        next && guidedId
          ? { label: 'Start', onPress: () => onStart(guidedId), accessibilityLabel: `Start ${title}` }
          : undefined
      }
      onPress={() => onToggle(row)}
      accessibilityLabel={`${title}, ${done ? `prayed at ${time}` : `scheduled for ${time}`}`}
    />
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
    title: { ...display(20, 'bold', { tracking: -0.02 }), color: c.ink },
    count: { ...body(14, 'bold'), color: c.ink },
    progress: { marginTop: 12 },
    rows: { gap: 8, marginTop: 14 },
    empty: { paddingVertical: 12, paddingHorizontal: 0 },
  });
