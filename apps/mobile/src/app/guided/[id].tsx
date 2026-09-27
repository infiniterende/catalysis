import { buildRule, GUIDED_PRAYERS, toISODate } from '@catalysis/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutlineButton, PrimaryButton } from '@/components/Buttons';
import { Label, Tag } from '@/components/Label';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Touchable } from '@/components/Touchable';
import { actions, store } from '@/lib/store';
import { colors, display, text } from '@/theme';

/** Guided prayer, one step at a time. */
export default function GuidedPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [index, setIndex] = useState(0);

  const prayer = GUIDED_PRAYERS.find((candidate) => candidate.id === id);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/prayer'));

  if (!prayer) {
    return (
      <Screen tone="black" padBottom>
        <EmptyState
          tone="dark"
          style={styles.missing}
          action={<OutlineButton tone="dark" label="Back to prayer" onPress={close} />}>
          This prayer could not be found.
        </EmptyState>
      </Screen>
    );
  }

  const step = prayer.steps[Math.min(index, prayer.steps.length - 1)];
  const last = index >= prayer.steps.length - 1;

  const amen = () => {
    const { prayers, prayerLogs } = store.getState();
    const row = buildRule(prayers, prayerLogs, toISODate(new Date()))
      .find((candidate) => candidate.prayer.guidedContentId === prayer.id);
    if (row && !row.done) actions().togglePrayer(row.prayer.id);
    close();
  };

  return (
    <Screen tone="black">
      <View style={styles.header}>
        <Touchable onPress={close} accessibilityRole="button" accessibilityLabel="Close">
          <Label color={colors.onDarkMuted}>Close</Label>
        </Touchable>
        <Label color={colors.onDarkMuted} numberOfLines={1} style={styles.headerTitle}>
          {prayer.title} · {prayer.minutes} min
        </Label>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Tag size={10} padV={6} padH={10}>{`Step ${index + 1} of ${prayer.steps.length}`}</Tag>
        <Text accessibilityRole="header" style={styles.title}>{step?.title}</Text>
        <Text style={styles.body}>{step?.body}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        <OutlineButton
          tone="dark"
          label="Back"
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={styles.button}
        />
        <PrimaryButton
          tone="dark"
          label={last ? 'Amen' : 'Continue'}
          padV={17}
          onPress={last ? amen : () => setIndex((i) => i + 1)}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: { flexShrink: 1, textAlign: 'right' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 32 },
  title: { ...display(44, { lineHeight: 1.04 }), color: colors.paper, marginTop: 20, paddingTop: 4 },
  body: { ...text(18, { lineHeight: 1.62 }), color: colors.onDarkBody, marginTop: 20 },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 14, paddingHorizontal: 20 },
  button: { flex: 1 },
});
