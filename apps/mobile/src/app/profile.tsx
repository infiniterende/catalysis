import { allTimePrayers, computeStreak, initialOf, type Milestone, type User } from '@catalysis/api';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton } from '@/components/Buttons';
import { Field, FieldError } from '@/components/Field';
import { Label } from '@/components/Label';
import { Placeholder } from '@/components/Photo';
import { DisclosureRow, NumberedRow, SectionHeading, StatGrid } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { IconButton, Touchable } from '@/components/Touchable';
import { useToday } from '@/lib/now';
import { actions, useApp } from '@/lib/store';
import { colors, display, spacing } from '@/theme';

/** 09 · User Profile. */
export default function Profile() {
  const router = useRouter();
  const { today } = useToday();
  const user = useApp((s) => s.user);
  const prayerLogs = useApp((s) => s.prayerLogs);
  const allTime = useApp(allTimePrayers);
  const [settings, setSettings] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Signing out swaps this screen for Landing; there is a frame in between with no user.
  if (!user) return <Screen><View /></Screen>;

  const [firstName, ...rest] = user.name.trim().split(/\s+/);
  const surname = rest.join(' ');

  const choosePortrait = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) actions().updateProfile({ portraitUrl: uri });
    } catch {
      setPhotoError('Your photos could not be opened. Check the permission in Settings.');
    }
  };

  return (
    <Screen padBottom>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconButton
            name="chevron-left"
            size={20}
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
          />
          <Label weight="semibold" accessibilityRole="header">Profile</Label>
        </View>
        <IconButton name="settings" label="Settings" onPress={() => setSettings(true)} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Touchable
            hitSlop={undefined}
            onPress={() => void choosePortrait()}
            accessibilityRole="button"
            accessibilityLabel={user.portraitUrl ? 'Change your portrait' : 'Add a portrait'}>
            {user.portraitUrl ? (
              <Image source={{ uri: user.portraitUrl }} contentFit="cover" style={styles.portrait} />
            ) : (
              <Placeholder style={[styles.portrait, styles.portraitEmpty]}>
                <Text style={styles.initial}>{initialOf(user.name)}</Text>
              </Placeholder>
            )}
          </Touchable>
          <View style={styles.names}>
            <Text accessibilityRole="header" accessibilityLabel={user.name} style={styles.name}>
              {firstName}{surname ? `\n${surname}` : ''}
            </Text>
            <Label size={8.5} color={colors.muted} style={styles.handle}>
              {user.handle}{'\n'}{user.parish}
            </Label>
          </View>
        </View>
        {photoError ? <FieldError style={styles.photoError}>{photoError}</FieldError> : null}

        {user.quote ? (
          <View style={styles.quote}>
            <Text style={styles.quoteText}>
              <Text style={styles.quoteMark}>“</Text>
              {user.quote.text}
              <Text style={styles.quoteMark}>”</Text>
            </Text>
            <Label size={8.5} color={colors.subtle} style={styles.attribution}>— {user.quote.attribution}</Label>
          </View>
        ) : null}

        <StatGrid
          numeralSize={30}
          style={styles.stats}
          stats={[
            { value: String(computeStreak(prayerLogs, today)), label: 'Day streak', accent: true },
            { value: String(allTime), label: 'Prayers' },
            { value: String(user.booksRead), label: 'Books read' },
          ]}
        />

        <SectionHeading>Milestones</SectionHeading>
        {user.milestones.map((milestone, i) => <MilestoneRow key={milestone.id} milestone={milestone} index={i} />)}

        <DisclosureRow label="Saved verses & notes" onPress={() => router.push('/saved')} style={styles.saved} />
      </ScrollView>

      {settings ? <SettingsSheet user={user} onClose={() => setSettings(false)} /> : null}
    </Screen>
  );
}

function MilestoneRow({ milestone, index }: { milestone: Milestone; index: number }) {
  const achieved = Boolean(milestone.achieved);
  const progress = milestone.progress ? `${milestone.progress.current} / ${milestone.progress.total}` : '';
  return (
    <NumberedRow
      numeral={String(index + 1).padStart(2, '0')}
      numeralColor={achieved ? colors.crimson : colors.disabled}
      title={milestone.title}
      titleStyle={achieved ? undefined : styles.pending}
      meta={<Label size={8} color={achieved ? colors.subtle : colors.crimson}>{milestone.achieved ?? progress}</Label>}
    />
  );
}

/** Mounted only while open, so the fields start from the saved profile. */
function SettingsSheet({ user, onClose }: { user: User; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [parish, setParish] = useState(user.parish);
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    actions().updateProfile({ name: name.trim(), parish: parish.trim() });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title="Settings" scroll>
      <Field label="Name" value={name} onChangeText={setName} error={error} autoCapitalize="words" autoComplete="name" />
      <Field label="Parish" value={parish} onChangeText={setParish} autoCapitalize="words" style={styles.field} />
      <PrimaryButton label="Save" onPress={save} style={styles.save} />
      {/* Signing out flips the root layout's guard, which returns the app to Landing. */}
      <OutlineButton
        label="Log out"
        style={styles.logout}
        onPress={() => {
          onClose();
          actions().signOut();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 12,
    paddingHorizontal: spacing.pageMobile,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { paddingHorizontal: spacing.pageMobile, paddingBottom: 32 },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: 18, paddingTop: 22 },
  portrait: { width: 104, height: 130 },
  portraitEmpty: { alignItems: 'center', justifyContent: 'center' },
  initial: { ...display(40), color: colors.white },
  names: { flex: 1, paddingBottom: 4 },
  name: { ...display(32, { lineHeight: 1 }), color: colors.ink, paddingTop: 4 },
  handle: { marginTop: 10, lineHeight: 8.5 * 1.7 },
  photoError: { marginTop: 8 },
  quote: { paddingTop: 20 },
  quoteText: { ...display(19, { italic: true, lineHeight: 1.35 }), color: colors.ink },
  quoteMark: { color: colors.crimson },
  attribution: { marginTop: 8 },
  stats: { marginTop: 20 },
  pending: { color: colors.subtle },
  saved: { marginTop: 14 },
  field: { marginTop: 22 },
  save: { marginTop: 22 },
  logout: { marginTop: 10 },
});
