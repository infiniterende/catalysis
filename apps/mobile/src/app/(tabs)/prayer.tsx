import {
  allTimePrayers, buildRule, buildWeek, computeStreak, DEFAULT_PRAYERS, FEATURED_GUIDED_IDS, formatTime12,
  GUIDED_PRAYERS, roman, TONIGHT, type RuleRow,
} from '@catalysis/api';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Label, Tag } from '@/components/Label';
import { Photo, Scrim } from '@/components/Photo';
import { NumberedRow, SectionHeading, StatGrid } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { Touchable } from '@/components/Touchable';
import { AddPrayerSheet } from '@/features/prayer/AddPrayerSheet';
import { WeekBars } from '@/features/prayer/WeekBars';
import { confirm } from '@/lib/native';
import { useToday } from '@/lib/now';
import { remindersEnabled, syncReminders, turnRemindersOff, turnRemindersOn } from '@/lib/reminders';
import { actions, useApp } from '@/lib/store';
import { colors, display, spacing, text } from '@/theme';

const BUILT_IN = new Set(DEFAULT_PRAYERS.map((prayer) => prayer.id));
const TONIGHT_PHOTO = { kind: 'image', asset: 'rosary', focus: '25% 70%' } as const;

const REMINDER_NOTES = {
  denied: 'Notifications are turned off for Catalysis. Allow them in Settings to be reminded.',
  unavailable: 'Reminders are not available on this device.',
} as const;

/** 05 · Prayer Guide & Tracker. */
export default function Prayer() {
  const router = useRouter();
  const { today } = useToday();
  const prayers = useApp((s) => s.prayers);
  const prayerLogs = useApp((s) => s.prayerLogs);
  const allTime = useApp(allTimePrayers);

  const [adding, setAdding] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);

  const rule = buildRule(prayers, prayerLogs, today);
  const doneCount = rule.filter((row) => row.done).length;
  const guided = FEATURED_GUIDED_IDS
    .map((id) => GUIDED_PRAYERS.find((prayer) => prayer.id === id))
    .filter((prayer) => prayer !== undefined);

  const openGuided = (id: string) => router.push({ pathname: '/guided/[id]', params: { id } });

  useEffect(() => {
    let active = true;
    void remindersEnabled().then((on) => {
      if (active) setReminders(on);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep the scheduled notifications in step with the rule.
  useEffect(() => {
    void syncReminders(prayers);
  }, [prayers]);

  const toggleReminders = async () => {
    const result = reminders ? await turnRemindersOff() : await turnRemindersOn(prayers);
    setReminders(result === 'on');
    setReminderNote(result === 'denied' || result === 'unavailable' ? REMINDER_NOTES[result] : null);
  };

  const remove = async (row: RuleRow) => {
    const yes = await confirm({
      title: `Remove “${row.prayer.title}”?`,
      message: 'It will be taken out of your rule, along with its history.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (yes) actions().removePrayer(row.prayer.id);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Label color={colors.crimson}>A rule of life</Label>
          <Text accessibilityRole="header" style={styles.title}>Prayer</Text>
          <Text style={styles.deck}>Kept one day at a time.</Text>
        </View>

        <View style={styles.week}>
          <WeekBars week={buildWeek(prayerLogs, today, prayers.length)} />
        </View>

        <StatGrid
          style={styles.stats}
          stats={[
            { value: String(computeStreak(prayerLogs, today)), label: 'Day streak', accent: true },
            { value: `${doneCount}/${rule.length}`, label: 'Today' },
            { value: String(allTime), label: 'All time' },
          ]}
        />

        <SectionHeading>Today</SectionHeading>
        {rule.map((row, i) => (
          <ChecklistRow
            key={row.prayer.id}
            row={row}
            last={i === rule.length - 1}
            onBegin={row.prayer.guidedContentId ? () => openGuided(row.prayer.guidedContentId ?? '') : undefined}
            onRemove={BUILT_IN.has(row.prayer.id) ? undefined : () => void remove(row)}
          />
        ))}
        <Touchable
          onPress={() => setAdding(true)}
          accessibilityRole="button"
          accessibilityLabel="Add prayer"
          style={styles.add}>
          <Label size={9} weight="bold" color={colors.crimson}>+ Add prayer</Label>
        </Touchable>

        <SectionHeading>Guided</SectionHeading>
        {guided.map((prayer, i) => (
          <NumberedRow
            key={prayer.id}
            numeral={roman(i + 1)}
            title={prayer.title}
            meta={<Label size={8.5} color={colors.subtle}>{prayer.minutes} min</Label>}
            padV={8}
            borderColor={null}
            onPress={() => openGuided(prayer.id)}
            accessibilityLabel={`${prayer.title}, ${prayer.minutes} minutes`}
          />
        ))}

        <Photo media={TONIGHT_PHOTO} style={styles.tonight} accessibilityLabel="A silver crucifix and rosary on lace">
          <Scrim from={0.4} to={1} strength={0.82} />
          <View style={styles.tonightCopy}>
            <Tag size={10} padV={7} padH={11}>{TONIGHT.tag}</Tag>
            <Text style={styles.tonightTitle}>{TONIGHT.title}</Text>
            <Text style={styles.tonightDeck}>{TONIGHT.deck}</Text>
            <PrimaryButton
              tone="dark"
              label={TONIGHT.action}
              padV={16}
              size={10}
              style={styles.tonightButton}
              onPress={() => openGuided(TONIGHT.guidedId)}
            />
          </View>
        </Photo>

        <Touchable
          hitSlop={undefined}
          onPress={() => void toggleReminders()}
          accessibilityRole="switch"
          accessibilityLabel="Reminders"
          accessibilityHint="A daily notification at each prayer’s time"
          accessibilityState={{ checked: reminders }}
          style={styles.reminders}>
          <Label>Reminders</Label>
          <Label weight={reminders ? 'bold' : 'medium'} color={reminders ? colors.crimson : colors.muted}>
            {reminders ? 'On' : 'Off'}
          </Label>
        </Touchable>
        {reminderNote ? <Text style={styles.reminderNote}>{reminderNote}</Text> : null}
      </ScrollView>

      {adding ? <AddPrayerSheet onClose={() => setAdding(false)} onAdd={(input) => actions().addPrayer(input)} /> : null}
    </Screen>
  );
}

interface ChecklistRowProps {
  row: RuleRow;
  last: boolean;
  /** Opens the guided prayer, when the prayer has one. */
  onBegin?: () => void;
  /** Set for prayers the user added; offered on long-press. */
  onRemove?: () => void;
}

function ChecklistRow({ row, last, onBegin, onRemove }: ChecklistRowProps) {
  const { prayer, log, done, next } = row;
  return (
    <Touchable
      hitSlop={undefined}
      pressedOpacity={1}
      onLongPress={onRemove}
      accessibilityLabel={prayer.title}
      accessibilityHint={onRemove ? 'Long press to remove from your rule' : undefined}
      style={[styles.row, last && styles.rowLast]}>
      <Touchable
        onPress={() => actions().togglePrayer(prayer.id)}
        accessibilityRole="checkbox"
        accessibilityLabel={prayer.title}
        accessibilityState={{ checked: done }}
        style={[styles.checkbox, done && styles.checkboxDone]}>
        {done ? <Icon name="check" size={13} color={colors.white} /> : null}
      </Touchable>
      <Text style={next ? styles.rowTitleNext : styles.rowTitle}>{prayer.title}</Text>
      {log ? (
        <Label size={8.5} color={colors.subtle}>{formatTime12(new Date(log.completedAt))}</Label>
      ) : next && onBegin ? (
        <Touchable onPress={onBegin} accessibilityRole="button" accessibilityLabel={`Begin ${prayer.title}`}>
          <Label size={8.5} weight="bold" color={colors.crimson}>Begin →</Label>
        </Touchable>
      ) : (
        <Label size={8.5} weight={next ? 'bold' : 'medium'} color={next ? colors.crimson : colors.subtle}>
          {formatTime12(prayer.scheduledTime)}
        </Label>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.pageMobile, paddingBottom: 36 },
  header: { paddingTop: 10 },
  title: { ...display(54, { italic: true, lineHeight: 1 }), color: colors.ink, marginTop: 8, paddingTop: 6 },
  deck: { ...text(15, { italic: true }), color: colors.muted, marginTop: 8 },
  week: { paddingTop: 22 },
  stats: { marginTop: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  rowLast: { borderBottomColor: colors.ink },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.ink },
  rowTitle: { ...text(15.5), flex: 1, color: colors.ink },
  rowTitleNext: { ...text(15.5, { bold: true }), flex: 1, color: colors.ink },
  add: { alignSelf: 'flex-start', paddingTop: 14 },
  tonight: { height: 360, marginTop: 26 },
  tonightCopy: { position: 'absolute', left: 22, right: 22, bottom: 24 },
  tonightTitle: { ...display(36, { lineHeight: 1.02 }), color: colors.paper, marginTop: 16, paddingTop: 4 },
  tonightDeck: { ...text(15.5, { italic: true, lineHeight: 1.45 }), color: colors.onDarkBody, marginTop: 10 },
  tonightButton: { marginTop: 20 },
  reminders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  reminderNote: { ...text(13.5, { italic: true, lineHeight: 1.5 }), color: colors.muted, marginTop: 10 },
});
