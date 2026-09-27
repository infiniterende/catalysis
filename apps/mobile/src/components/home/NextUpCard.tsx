import { formatHour, parseISODate, WEEKDAYS_SHORT, type CalendarEvent } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Touchable } from '@/components/ui';
import { body, display, useStyles, type ThemeColors } from '@/theme';

import { BENTO_HEIGHT } from './StreakCard';

export interface NextUpCardProps {
  /** The next event, if there is one. */
  event: CalendarEvent | undefined;
  going: boolean;
  onOpen: () => void;
  onToggleRsvp: (event: CalendarEvent) => void;
}

/** Home's next-event tile, on `a4`. Opens the calendar; the chip answers the RSVP. */
export function NextUpCard({ event, going, onOpen, onToggleRsvp }: NextUpCardProps) {
  const styles = useStyles(themed);
  const date = event ? parseISODate(event.date) : undefined;
  const title = event ? event.shortTitle ?? event.title : '';

  return (
    <Card surface="a4" radius={26} style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>Next up</Text>
        {event ? (
          <Chip
            label={going ? 'Going' : 'RSVP'}
            tone="dark"
            offTone="wash"
            icon={going ? 'check' : undefined}
            selected={going}
            onPress={() => onToggleRsvp(event)}
            accessibilityLabel={going ? `Going to ${event.title}` : `RSVP to ${event.title}`}
          />
        ) : null}
      </View>

      {/* The tile's body and its RSVP chip are siblings: a button may not sit inside another. */}
      <Touchable
        onPress={onOpen}
        hitSlop={undefined}
        pressedOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel={
          event && date
            ? `Next up: ${event.title}, ${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()}, ${formatHour(event.time)}, ${event.location}`
            : 'Nothing coming up'
        }
        accessibilityHint="Opens the calendar"
        style={styles.body}>
        {event && date ? (
          <>
            <Text numberOfLines={1} style={styles.date}>
              {WEEKDAYS_SHORT[date.getDay()]} {date.getDate()}
            </Text>
            <Text numberOfLines={2} style={styles.detail}>{title} · {formatHour(event.time)}</Text>
          </>
        ) : (
          <>
            <Text style={styles.date}>All clear</Text>
            <Text style={styles.detail}>See the calendar</Text>
          </>
        )}
      </Touchable>
    </Card>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    card: { flex: 1, minHeight: BENTO_HEIGHT },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
    label: { ...body(13, 'bold'), color: c.onA },
    body: { flex: 1, justifyContent: 'flex-end', paddingTop: 12 },
    date: { ...display(30, 'extrabold', { lineHeight: 1, tracking: -0.04 }), color: c.onA },
    detail: { ...body(13, 'semibold', { lineHeight: 1.3 }), color: c.onA, marginTop: 6 },
  });
