import {
  allEvents, buildRule, buildWeek, computeStreak, defaultEditionShort, getLiturgicalDay, greeting, MONTHS_SHORT,
  nextEvent, VERSE_OF_THE_DAY, WEEKDAYS_SHORT, type RuleRow,
} from '@catalysis/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomeHeader } from '@/components/home/HomeHeader';
import { NextUpCard } from '@/components/home/NextUpCard';
import { PrayersCard } from '@/components/home/PrayersCard';
import { StreakCard } from '@/components/home/StreakCard';
import { VerseCard } from '@/components/home/VerseCard';
import { EmptyState, Screen, Sheet, useTabBarSpace } from '@/components/ui';
import { successHaptic, tapHaptic } from '@/lib/haptics';
import { shareText } from '@/lib/native';
import { useToday } from '@/lib/now';
import { actions, useApp } from '@/lib/store';
import { layout } from '@/theme';

/** "Good morning" → "Morning, Maria" */
function shortGreeting(now: Date, firstName: string): string {
  const words = greeting(now).replace(/^good\s+/i, '');
  const phrase = words.charAt(0).toUpperCase() + words.slice(1);
  return firstName ? `${phrase}, ${firstName}` : phrase;
}

/** "Sat, Sept 26 · Sts. Cosmas & Damian" */
function dateLine(now: Date): string {
  const day = `${WEEKDAYS_SHORT[now.getDay()]}, ${MONTHS_SHORT[now.getMonth()]} ${now.getDate()}`;
  const { shortName } = getLiturgicalDay(now);
  return shortName ? `${day} · ${shortName}` : day;
}

/** 03 · Home. */
export default function Home() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const { now, today } = useToday();
  const name = useApp((s) => s.user?.name ?? '');
  const prayers = useApp((s) => s.prayers);
  const prayerLogs = useApp((s) => s.prayerLogs);
  const rsvpEventIds = useApp((s) => s.rsvpEventIds);
  const [notifications, setNotifications] = useState(false);

  const rule = buildRule(prayers, prayerLogs, today);
  const upcoming = nextEvent(allEvents(), today);
  const reference = `${VERSE_OF_THE_DAY.label} · ${defaultEditionShort()}`;

  const openVerse = () =>
    router.push({
      pathname: '/reader/[book]/[chapter]',
      params: { book: VERSE_OF_THE_DAY.bookId, chapter: String(VERSE_OF_THE_DAY.chapter) },
    });

  const togglePrayer = (row: RuleRow) => {
    if (row.done) tapHaptic();
    else successHaptic();
    actions().togglePrayer(row.prayer.id);
  };

  const toggleRsvp = (eventId: string) => {
    tapHaptic();
    actions().toggleRsvp(eventId);
  };

  return (
    <Screen>
      <HomeHeader
        name={name}
        greeting={shortGreeting(now, name.split(/\s+/)[0] ?? '')}
        dateLine={dateLine(now)}
        onOpenProfile={() => router.push('/profile')}
        onOpenCalendar={() => router.push('/events')}
        onOpenLumen={() => router.push('/lumen')}
        onOpenNotifications={() => setNotifications(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}>
        <VerseCard
          text={VERSE_OF_THE_DAY.text}
          reference={reference}
          onReflect={openVerse}
          onShare={() => void shareText(`“${VERSE_OF_THE_DAY.text}” ${reference}`)}
        />

        <View style={styles.bento}>
          <StreakCard
            streak={computeStreak(prayerLogs, today)}
            week={buildWeek(prayerLogs, today, prayers.length)}
            onPress={() => router.push('/prayer')}
          />
          <NextUpCard
            event={upcoming}
            going={upcoming ? rsvpEventIds.includes(upcoming.id) : false}
            onOpen={() => router.push('/events')}
            onToggleRsvp={(event) => toggleRsvp(event.id)}
          />
        </View>

        <PrayersCard
          rule={rule}
          onToggle={togglePrayer}
          onStart={(id) => router.push({ pathname: '/guided/[id]', params: { id } })}
        />
      </ScrollView>

      <Sheet visible={notifications} onClose={() => setNotifications(false)} title="Notifications">
        <EmptyState icon="bell" title="Nothing new">Peace be with you.</EmptyState>
      </Sheet>
    </Screen>
  );
}

// Nothing here depends on the theme, so the styles are static; themed styles go through `useStyles`.
const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingHorizontal: layout.screen, gap: layout.gap },
  bento: { flexDirection: 'row', gap: layout.gap },
});
