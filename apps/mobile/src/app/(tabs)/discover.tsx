import { DISCOVER_COLUMNS, PEOPLE, type DiscoverTile, type Media } from '@catalysis/api';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Label } from '@/components/Label';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Tabs } from '@/components/Tabs';
import { IconButton, Touchable } from '@/components/Touchable';
import { PersonRow } from '@/features/people/PersonRow';
import { focusToPosition, mediaSource } from '@/lib/assets';
import { useApp } from '@/lib/store';
import { colors, display, spacing, tracking } from '@/theme';

type Section = 'reels' | 'photos' | 'people';

const SECTIONS = [
  { key: 'reels', label: 'Reels' },
  { key: 'photos', label: 'Photos' },
  { key: 'people', label: 'People' },
] as const satisfies readonly { key: Section; label: string }[];

const GUTTER = 3;

/** 11 · Discover. Shown with the tab bar, Reels highlighted. */
export default function Discover() {
  const router = useRouter();
  const blockedUserIds = useApp((s) => s.blockedUserIds);
  const [section, setSection] = useState<Section>('reels');
  const [viewing, setViewing] = useState<Media | null>(null);

  const columns = DISCOVER_COLUMNS.map((column) =>
    section === 'photos' ? column.filter((tile) => tile.kind === 'photo') : column);
  const people = PEOPLE.filter((person) => !blockedUserIds.includes(person.id));

  const open = (tile: DiscoverTile) => {
    if (tile.kind === 'reel' && tile.reelId) router.navigate({ pathname: '/reels', params: { reel: tile.reelId } });
    else if (tile.media) setViewing(tile.media);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Discover</Text>
        <IconButton name="search" label="Search" onPress={() => router.push('/search')} style={styles.search} />
      </View>
      <Tabs tabs={SECTIONS} value={section} onChange={setSection} gap={24} padH={spacing.pageMobile} />

      {section === 'people' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.people}>
          {people.length === 0
            ? <EmptyState>No one to suggest just now.</EmptyState>
            : people.map((person) => <PersonRow key={person.id} person={person} />)}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.masonry}>
          {columns.map((column, i) => (
            <View key={i} style={styles.column}>
              {column.map((tile) => <Tile key={tile.id} tile={tile} onPress={() => open(tile)} />)}
            </View>
          ))}
        </ScrollView>
      )}

      <Touchable
        hitSlop={undefined}
        pressedOpacity={0.85}
        onPress={() => router.push('/create')}
        accessibilityRole="button"
        accessibilityLabel="New post"
        style={styles.fab}>
        <Icon name="plus" size={24} color={colors.white} />
      </Touchable>

      <Modal visible={viewing !== null} animationType="fade" onRequestClose={() => setViewing(null)} statusBarTranslucent>
        <Pressable
          onPress={() => setViewing(null)}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          style={styles.viewer}>
          {viewing ? (
            <Image
              source={mediaSource(viewing)}
              contentFit="contain"
              contentPosition={focusToPosition(undefined)}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Tile({ tile, onPress }: { tile: DiscoverTile; onPress: () => void }) {
  const reel = tile.kind === 'reel';
  return (
    <Touchable
      hitSlop={undefined}
      pressedOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={reel ? `Reel: ${tile.title ?? ''}, ${tile.meta ?? ''}` : 'Photo'}>
      <Photo media={tile.media} style={{ height: tile.height }}>
        <View style={[styles.tileIcon, reel ? styles.tileIconLeft : styles.tileIconRight]}>
          <Icon
            name={reel ? 'play' : 'image'}
            size={reel ? 15 : 14}
            color={tile.iconTone === 'dark' ? colors.ink : colors.white}
          />
        </View>
        {tile.title ? (
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} style={styles.tileCaption}>
            <Text style={styles.tileTitle}>{tile.title}</Text>
            {tile.meta ? (
              <Label size={8} em={tracking.labelTile} color={colors.onDarkMuted} style={styles.tileMeta}>
                {tile.meta}
              </Label>
            ) : null}
          </LinearGradient>
        ) : null}
      </Photo>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 14,
    paddingHorizontal: spacing.pageMobile,
  },
  title: { ...display(42, { italic: true, lineHeight: 1 }), color: colors.ink, paddingTop: 6 },
  search: { paddingBottom: 6 },
  masonry: { flexDirection: 'row', gap: GUTTER, paddingTop: GUTTER, paddingBottom: 96 },
  column: { flex: 1, gap: GUTTER },
  people: { paddingHorizontal: spacing.pageMobile, paddingBottom: 96 },
  tileIcon: { position: 'absolute', top: 12 },
  tileIconLeft: { left: 12 },
  tileIconRight: { right: 12 },
  tileCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingTop: 28 },
  tileTitle: { ...display(17, { lineHeight: 1.15 }), color: colors.white },
  tileMeta: { marginTop: 6 },
  fab: {
    position: 'absolute',
    right: 18,
    // 92px from the bottom of the phone in the design, less the 76px tab bar beneath this screen.
    bottom: 16,
    width: 54,
    height: 54,
    backgroundColor: colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
  },
  viewer: { flex: 1, backgroundColor: colors.black },
});
