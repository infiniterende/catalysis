import { feedPosts, type FeedId, type Post } from '@catalysis/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { Tabs } from '@/components/Tabs';
import { IconButton, Touchable } from '@/components/Touchable';
import { useModeration } from '@/features/community/moderation';
import { PostCard } from '@/features/community/PostCard';
import { useNow } from '@/lib/now';
import { useAppShallow } from '@/lib/store';
import { colors, display, spacing, text } from '@/theme';

const FEEDS = [
  { key: 'forYou', label: 'For you' },
  { key: 'group:g-newman', label: 'Newman Center' },
  { key: 'intentions', label: 'Intentions' },
] as const satisfies readonly { key: FeedId; label: string }[];

const EMPTY: Record<(typeof FEEDS)[number]['key'], string> = {
  forYou: 'Nothing here yet. Be the first to share a reflection.',
  'group:g-newman': 'No posts from the Newman Center yet.',
  intentions: 'No intentions at the moment. Ask, and others will pray with you.',
};

/** 06 · Community. */
export default function Community() {
  const router = useRouter();
  const now = useNow();
  const [feed, setFeed] = useState<(typeof FEEDS)[number]['key']>('forYou');
  const [notifications, setNotifications] = useState(false);
  const posts = useAppShallow((s) => feedPosts(s, feed));
  const moderation = useModeration();

  const openThread = (post: Post) => router.push({ pathname: '/post/[id]', params: { id: post.id } });

  return (
    <Screen>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Community</Text>
        <View style={styles.headerIcons}>
          <IconButton name="search" label="Search" onPress={() => router.push('/search')} />
          <IconButton name="bell" label="Notifications" onPress={() => setNotifications(true)} />
        </View>
      </View>
      <Tabs tabs={FEEDS} value={feed} onChange={setFeed} padH={spacing.pageMobile} />

      <FlatList
        data={posts}
        extraData={now}
        keyExtractor={(post) => post.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Touchable
            hitSlop={undefined}
            onPress={() => router.push({ pathname: '/create', params: { mode: 'text' } })}
            accessibilityRole="button"
            accessibilityLabel="Share a reflection or an intention"
            style={styles.compose}>
            <Text style={styles.composeText}>Share a reflection or an intention…</Text>
            <Icon name="pen-line" size={18} />
          </Touchable>
        }
        ListEmptyComponent={<EmptyState>{EMPTY[feed]}</EmptyState>}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            now={now}
            divider={index < posts.length - 1}
            onOpenThread={() => openThread(item)}
            onMore={moderation.open}
          />
        )}
      />

      <Sheet visible={notifications} onClose={() => setNotifications(false)} title="Notifications">
        <EmptyState>Nothing new. Peace be with you.</EmptyState>
      </Sheet>
      {moderation.sheet}
    </Screen>
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
  headerIcons: { flexDirection: 'row', gap: 16, paddingBottom: 6 },
  list: { paddingBottom: 24 },
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: spacing.pageMobile,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  composeText: { ...text(15, { italic: true }), color: colors.subtle },
});
