import { feedReels, type Reel } from '@catalysis/api';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Tabs } from '@/components/Tabs';
import { IconButton } from '@/components/Touchable';
import { useModeration } from '@/features/community/moderation';
import { ReelPage } from '@/features/reels/ReelPage';
import { store, useApp } from '@/lib/store';
import { colors } from '@/theme';

type ReelFeed = 'following' | 'forYou';

const FEEDS = [
  { key: 'following', label: 'Following' },
  { key: 'forYou', label: 'For you' },
] as const satisfies readonly { key: ReelFeed; label: string }[];

/** 10 · Reels. One reel per page, snapping vertically. */
export default function Reels() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ reel?: string }>();

  // `feedReels` builds new objects on each call, so it cannot be a store selector.
  // The slices it reads are subscribed to here and the feed is derived from them.
  const posts = useApp((s) => s.posts);
  const hiddenReelIds = useApp((s) => s.hiddenReelIds);
  const hiddenPostIds = useApp((s) => s.hiddenPostIds);
  const blockedUserIds = useApp((s) => s.blockedUserIds);
  const followingIds = useApp((s) => s.followingIds);
  const user = useApp((s) => s.user);

  const [feed, setFeed] = useState<ReelFeed>('forYou');
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState(0);
  const [muted, setMuted] = useState(true);
  const list = useRef<FlatList<Reel>>(null);

  const state = { ...store.getState(), posts, hiddenReelIds, hiddenPostIds, blockedUserIds, followingIds, user };
  const reels = feedReels(state, feed);
  const ownPostIds = new Set(posts.filter((post) => post.type === 'reel').map((post) => post.id));

  const moderation = useModeration({ tone: 'dark' });

  // Discover opens a particular reel with `?reel=`. Switch to a feed that contains it.
  const [opened, setOpened] = useState<string | undefined>(undefined);
  const requested = params.reel;
  if (requested && requested !== opened) {
    setOpened(requested);
    if (!reels.some((reel) => reel.id === requested)) {
      const other: ReelFeed = feed === 'forYou' ? 'following' : 'forYou';
      if (feedReels(state, other).some((reel) => reel.id === requested)) setFeed(other);
    }
  }

  const requestedIndex = requested ? reels.findIndex((reel) => reel.id === requested) : -1;
  useEffect(() => {
    if (requestedIndex >= 0 && height > 0) {
      list.current?.scrollToOffset({ offset: requestedIndex * height, animated: false });
    }
  }, [requested, requestedIndex, height]);

  const changeFeed = (next: ReelFeed) => {
    setFeed(next);
    setIndex(0);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  return (
    <Screen tone="black" padTop={false}>
      <View style={styles.fill} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {height > 0 ? (
          <FlatList
            ref={list}
            data={reels}
            // Pages depend on more than their reel; without this the list would not redraw them.
            extraData={`${height}:${index}:${muted}:${focused}`}
            keyExtractor={(reel) => reel.id}
            pagingEnabled
            snapToInterval={height}
            disableIntervalMomentum
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.y / height))}
            getItemLayout={(_data, i) => ({ length: height, offset: height * i, index: i })}
            initialNumToRender={2}
            windowSize={3}
            ListEmptyComponent={
              <EmptyState tone="dark" style={[styles.empty, { height }]}>
                {feed === 'following'
                  ? 'Reels from the people and parishes you follow will appear here.'
                  : 'No reels just now. Come back soon.'}
              </EmptyState>
            }
            renderItem={({ item, index: i }) => (
              <ReelPage
                reel={item}
                height={height}
                active={focused && i === index}
                muted={muted}
                onToggleMute={() => setMuted((value) => !value)}
                onMore={moderation.open}
                onOpenThread={ownPostIds.has(item.id)
                  ? () => router.push({ pathname: '/post/[id]', params: { id: item.id } })
                  : undefined}
              />
            )}
          />
        ) : null}

        <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 6 }]}>
          <Tabs tabs={FEEDS} value={feed} onChange={changeFeed} variant="overlay" gap={26} />
          <IconButton
            name="search"
            color={colors.white}
            label="Discover"
            onPress={() => router.push('/discover')}
            style={[styles.search, { top: insets.top + 3 }]}
          />
        </View>
      </View>
      {moderation.sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  search: { position: 'absolute', right: 20 },
  empty: { justifyContent: 'center' },
});
