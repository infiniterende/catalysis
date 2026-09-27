import {
  allEvents, buildMonthGrid, eventsOn, formatDayLong, formatTime12, getLiturgicalDay, hasCelebration,
  isFeastDay, MONTHS, nextEvent, parseISODate, shiftMonth, sortEvents, splitTime12,
  type CalendarEvent, type ISODate, type MonthCell,
} from '@catalysis/api';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Buttons';
import { Label } from '@/components/Label';
import { NumberedRow, SectionHeading } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { ActionSheet } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { IconButton, Touchable } from '@/components/Touchable';
import { addToCalendar } from '@/lib/calendar';
import { notify, shareText } from '@/lib/native';
import { useToday } from '@/lib/now';
import { actions, useApp } from '@/lib/store';
import { colors, display, spacing, text, tracking } from '@/theme';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CALENDAR_MESSAGES = {
  added: ['Added to your calendar.', undefined],
  denied: ['Calendar access is off.', 'Allow Catalysis to add events in Settings, then try again.'],
  unavailable: ['Could not add the event.', 'No calendar is available on this device.'],
} as const;

/** 07 · Events & Calendar. Shown with the tab bar, Today highlighted. */
export default function Events() {
  const { today } = useToday();
  const rsvpEventIds = useApp((s) => s.rsvpEventIds);
  const events = allEvents();

  // Opens on the day of the next event, as drawn, so there is always something to see.
  const [selected, setSelected] = useState<ISODate>(() => nextEvent(events, today)?.date ?? today);
  const [month, setMonth] = useState(() => {
    const date = parseISODate(selected);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const [menuFor, setMenuFor] = useState<CalendarEvent | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const show = (date: ISODate) => {
    const day = parseISODate(date);
    setSelected(date);
    setMonth({ year: day.getFullYear(), month: day.getMonth() });
  };

  // Search links here with `?date=`. The screen stays mounted as a tab, so a new date
  // is applied when it arrives rather than only on first render.
  const params = useLocalSearchParams<{ date?: string }>();
  const requested = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;
  const [applied, setApplied] = useState<ISODate | undefined>(undefined);
  if (requested && requested !== applied) {
    setApplied(requested);
    show(requested);
  }

  const selectedDate = parseISODate(selected);
  const liturgicalDay = getLiturgicalDay(selected);
  const dayEvents = eventsOn(events, selected);
  const comingUp = sortEvents(events).filter((event) => event.date > selected).slice(0, 3);
  const eventDates = new Set(events.map((event) => event.date));


  const addEvent = async (event: CalendarEvent) => {
    const [title, message] = CALENDAR_MESSAGES[await addToCalendar(event)];
    notify(title, message);
  };

  const shareEvent = (event: CalendarEvent) =>
    void shareText(
      `${event.title}\n${formatDayLong(parseISODate(event.date))}, ${formatTime12(event.time)}\n${event.location}`,
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Label color={colors.crimson}>Calendar</Label>
        <View style={styles.monthRow}>
          <Text accessibilityRole="header" style={styles.month}>
            {MONTHS[month.month]} <Text style={styles.year}>{month.year}</Text>
          </Text>
          <View style={styles.arrows}>
            <IconButton
              name="chevron-left"
              label="Previous month"
              onPress={() => setMonth(shiftMonth(month.year, month.month, -1))}
            />
            <IconButton
              name="chevron-right"
              label="Next month"
              onPress={() => setMonth(shiftMonth(month.year, month.month, 1))}
            />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.weekdays}>
          {WEEKDAY_LETTERS.map((letter, i) => (
            <Label key={i} size={8.5} em={tracking.labelTiny} color={colors.subtle} style={styles.weekday}>
              {letter}
            </Label>
          ))}
        </View>
        <View style={styles.grid}>
          {buildMonthGrid(month.year, month.month).map((week) => (
            <View key={week[0]?.date} style={styles.week}>
              {week.map((cell) => (
                <DayCell
                  key={cell.date}
                  cell={cell}
                  today={cell.date === today}
                  selected={cell.date === selected}
                  hasEvents={eventDates.has(cell.date)}
                  onPress={() => show(cell.date)}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.day}>
          <Label weight="semibold" accessibilityRole="header">{formatDayLong(selectedDate, false)}</Label>
          {hasCelebration(liturgicalDay) || selectedDate.getDay() === 0 ? (
            <Text style={styles.celebration}>{liturgicalDay.celebration}</Text>
          ) : null}
        </View>

        <View style={styles.events}>
          {dayEvents.length === 0 ? (
            <EmptyState align="left" style={styles.empty}>No events this day.</EmptyState>
          ) : (
            dayEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                going={rsvpEventIds.includes(event.id)}
                onOpen={() => {
                  setMenuFor(event);
                  setMenuOpen(true);
                }}
              />
            ))
          )}
        </View>

        {comingUp.length > 0 ? (
          <View style={styles.coming}>
            <SectionHeading style={styles.comingHeading}>Coming up</SectionHeading>
            {comingUp.map((event) => (
              <NumberedRow
                key={event.id}
                numeral={String(parseISODate(event.date).getDate()).padStart(2, '0')}
                numeralSize={24}
                numeralWidth={30}
                title={event.title}
                meta={<Label size={8.5} color={colors.subtle}>{event.note ?? event.location}</Label>}
                onPress={() => show(event.date)}
                accessibilityLabel={`${event.title}, ${formatDayLong(parseISODate(event.date), false)}`}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={menuFor?.title}
        message={menuFor ? `${formatTime12(menuFor.time)} · ${menuFor.location}` : undefined}
        actions={menuFor ? [
          { label: 'Add to calendar', onPress: () => void addEvent(menuFor) },
          { label: 'Share', onPress: () => shareEvent(menuFor) },
        ] : []}
      />
    </Screen>
  );
}

interface DayCellProps {
  cell: MonthCell;
  today: boolean;
  selected: boolean;
  hasEvents: boolean;
  onPress: () => void;
}

function DayCell({ cell, today, selected, hasEvents, onPress }: DayCellProps) {
  const date = parseISODate(cell.date);
  const liturgicalDay = getLiturgicalDay(cell.date);
  const feast = cell.inMonth && isFeastDay(liturgicalDay);

  return (
    <Touchable
      hitSlop={undefined}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        formatDayLong(date, false),
        today ? 'today' : '',
        feast ? liturgicalDay.shortName : '',
        hasEvents ? 'has events' : '',
      ].filter(Boolean).join(', ')}
      accessibilityState={{ selected }}
      style={styles.cell}>
      <View style={[styles.cellBox, selected && styles.cellSelected]}>
        <View style={today && !selected ? styles.cellToday : null}>
          <Text
            style={[
              styles.cellText,
              feast && styles.cellFeast,
              !cell.inMonth && styles.cellOutside,
              selected && styles.cellTextSelected,
            ]}>
            {cell.day}
          </Text>
        </View>
      </View>
      <View style={[styles.dot, hasEvents && cell.inMonth ? styles.dotOn : null]} />
    </Touchable>
  );
}

interface EventRowProps {
  event: CalendarEvent;
  going: boolean;
  onOpen: () => void;
}

function EventRow({ event, going, onOpen }: EventRowProps) {
  const time = splitTime12(event.time);
  return (
    // The row and its RSVP button are siblings: a button may not sit inside another.
    <View style={styles.event}>
      <Touchable
        hitSlop={undefined}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${time.clock} ${time.meridiem}, ${event.location}`}
        accessibilityHint="Add to calendar or share"
        style={styles.eventOpen}>
        <View style={styles.eventTime}>
          <Text style={styles.eventClock}>{time.clock}</Text>
          <Label size={8} color={colors.subtle} style={styles.eventMeridiem}>{time.meridiem}</Label>
        </View>
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Label size={8.5} color={colors.muted} style={styles.eventPlace}>{event.location}</Label>
        </View>
      </Touchable>
      <Chip
        label={going ? 'Going' : 'RSVP'}
        filled={going}
        selected={going}
        accessibilityLabel={going ? `Going to ${event.title}` : `RSVP to ${event.title}`}
        onPress={() => actions().toggleRsvp(event.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: spacing.pageMobile,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  monthRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  month: { ...display(44, { lineHeight: 1 }), color: colors.ink, paddingTop: 6, flexShrink: 1 },
  year: { ...display(22, { italic: true }), color: colors.subtle },
  arrows: { flexDirection: 'row', gap: 14 },
  content: { paddingBottom: 32 },
  weekdays: { flexDirection: 'row', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 18 },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { paddingHorizontal: 18 },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingTop: 4 },
  cellBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: colors.ink },
  cellToday: { borderBottomWidth: 1.5, borderBottomColor: colors.ink, paddingHorizontal: 3, paddingBottom: 2 },
  cellText: { ...text(14), color: colors.ink, textAlign: 'center' },
  cellFeast: { ...text(14, { bold: true }), color: colors.crimson },
  cellOutside: { color: colors.disabled },
  cellTextSelected: { color: colors.white },
  // Every cell reserves the dot's space so rows keep one height.
  dot: { width: 3, height: 3, marginTop: 1, marginBottom: 0 },
  dotOn: { backgroundColor: colors.crimson },
  day: {
    marginTop: 14,
    marginHorizontal: spacing.pageMobile,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
  },
  celebration: { ...text(14, { italic: true }), color: colors.crimson, marginTop: 4 },
  events: { marginTop: 12, marginHorizontal: spacing.pageMobile },
  empty: { paddingHorizontal: 0, paddingVertical: 18 },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  eventOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  eventTime: { width: 52 },
  eventClock: { ...display(26, { lineHeight: 1 }), color: colors.crimson, paddingTop: 3 },
  eventMeridiem: { marginTop: 3 },
  eventBody: { flex: 1 },
  eventTitle: { ...text(16, { bold: true }), color: colors.ink },
  eventPlace: { marginTop: 5 },
  coming: { marginTop: 10, marginHorizontal: spacing.pageMobile },
  comingHeading: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.ink },
});
