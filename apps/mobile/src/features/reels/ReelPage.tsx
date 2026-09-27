import { compactCount, type Reel } from '@catalysis/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Icon, type IconName } from '@/components/Icon';
import { Label, Tag } from '@/components/Label';
import { Photo, Placeholder } from '@/components/Photo';
import { Touchable } from '@/components/Touchable';
import type { ModerationTarget } from '@/features/community/moderation';
import { shareText } from '@/lib/native';
import { actions, useApp } from '@/lib/store';
import { colors, display, onDark, text, tracking } from '@/theme';

import { ReelVideo } from './ReelVideo';

interface ReelPageProps {
  reel: Reel;
  height: number;
  /** The visible page of a focused screen: only then does video play. */
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onMore: (target: ModerationTarget) => void;
  /** Only the user's own reels have a reply thread; the seeded ones carry a count alone. */
  onOpenThread?: () => void;
}

/** A value that pops in and fades out: the heart on double-tap, the speaker on mute. */
function useFlash() {
  const [value] = useState(() => new Animated.Value(0));
  const play = () => {
    value.stopAnimation();
    value.setValue(0);
    Animated.sequence([
      Animated.spring(value, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 260, delay: 320, useNativeDriver: true }),
    ]).start();
  };
  const style = {
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  };
  return { play, style };
}

export function ReelPage({ reel, height, active, muted, onToggleMute, onMore, onOpenThread }: ReelPageProps) {
  const liked = useApp((s) => s.likedReelIds.includes(reel.id));
  const saved = useApp((s) => s.savedReelIds.includes(reel.id));
  const following = useApp((s) => s.followingIds.includes(reel.authorId));
  const own = useApp((s) => s.user?.id === reel.authorId);
  const heart = useFlash();
  const speaker = useFlash();

  const video = reel.media?.kind === 'video' && reel.media.url ? reel.media.url : undefined;

  const like = () => {
    if (!liked) actions().toggleLike(reel.id);
    heart.play();
  };

  const tapOnce = () => {
    if (!video) return;
    onToggleMute();
    speaker.play();
  };

  const more = () =>
    onMore({ kind: 'reel', id: reel.id, authorId: reel.authorId, authorName: reel.authorName });

  const gestures = Gesture.Race(
    Gesture.LongPress().runOnJS(true).minDuration(450).onStart(more),
    Gesture.Exclusive(
      Gesture.Tap().runOnJS(true).numberOfTaps(2).onEnd((_event, success) => {
        if (success) like();
      }),
      Gesture.Tap().runOnJS(true).onEnd((_event, success) => {
        if (success) tapOnce();
      }),
    ),
  );

  return (
    <View style={[styles.page, { height }]}>
      <GestureDetector gesture={gestures}>
        <View
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityLabel={`${reel.title} ${reel.subtitle}`.trim()}
          accessibilityHint={own ? 'Double tap to like. Long press to remove.' : 'Double tap to like. Long press to report or block.'}
          accessibilityActions={[{ name: 'longpress', label: own ? 'Remove' : 'Report or block' }]}
          onAccessibilityAction={more}>
          {video ? (
            <ReelVideo uri={video} active={active} muted={muted} />
          ) : reel.media ? (
            <Photo media={reel.media} style={StyleSheet.absoluteFill} />
          ) : (
            <Placeholder style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
            style={styles.scrim}
          />
        </View>
      </GestureDetector>

      <View pointerEvents="none" style={styles.flash}>
        <Animated.View style={[styles.flashIcon, heart.style]}>
          <Icon name="heart" size={96} color={colors.white} filled />
        </Animated.View>
        <Animated.View style={[styles.flashIcon, speaker.style]}>
          <Icon name={muted ? 'volume-x' : 'volume-2'} size={56} color={colors.white} />
        </Animated.View>
      </View>

      <View style={styles.rail} pointerEvents="box-none">
        <View style={styles.creator} accessible accessibilityLabel={reel.authorName}>
          <Text style={styles.creatorInitial}>{reel.initial}</Text>
        </View>
        <RailButton
          icon="heart"
          size={28}
          label={compactCount(reel.likeCount + (liked ? 1 : 0))}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          color={liked ? colors.crimson : colors.white}
          filled={liked}
          selected={liked}
          onPress={() => actions().toggleLike(reel.id)}
        />
        <RailButton
          icon="message-circle"
          label={compactCount(reel.commentCount)}
          accessibilityLabel={`${reel.commentCount} comments`}
          onPress={onOpenThread}
        />
        <RailButton
          icon="bookmark"
          label={saved ? 'Saved' : 'Save'}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save'}
          filled={saved}
          selected={saved}
          onPress={() => actions().toggleSave(reel.id)}
        />
        <RailButton
          icon="send"
          label="Share"
          accessibilityLabel="Share"
          onPress={() => void shareText(`${reel.title}\n${reel.authorName} on Catalysis`)}
        />
      </View>

      <View style={styles.caption} pointerEvents="box-none">
        <View style={styles.author} pointerEvents="box-none">
          <Label weight="bold" color={colors.white}>{reel.authorName}</Label>
          {own ? null : (
            <Touchable
              onPress={() => actions().toggleFollow(reel.authorId)}
              accessibilityRole="button"
              accessibilityLabel={following ? `Following ${reel.authorName}` : `Follow ${reel.authorName}`}
              accessibilityState={{ selected: following }}
              style={[styles.follow, following && styles.following]}>
              <Label size={8.5} color={following ? colors.black : colors.white}>
                {following ? 'Following' : 'Follow'}
              </Label>
            </Touchable>
          )}
        </View>
        {/* Touches on the words fall through to the media, so a double-tap there still likes. */}
        <View pointerEvents="none">
          <Text style={styles.title} numberOfLines={3}>{reel.title}</Text>
          {reel.subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{reel.subtitle}</Text> : null}
          <View style={styles.tags}>
            <Tag size={8.5} padV={5} padH={8}>{reel.category}</Tag>
            <Label size={8.5} color={colors.onDarkMuted}>{reel.audio}</Label>
          </View>
        </View>
      </View>
    </View>
  );
}

interface RailButtonProps {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  /** Without a handler the item is a plain count, not a button. */
  onPress?: () => void;
  size?: number;
  color?: string;
  filled?: boolean;
  selected?: boolean;
}

function RailButton({ icon, label, accessibilityLabel, onPress, size = 27, color = colors.white, filled, selected }: RailButtonProps) {
  const content = (
    <>
      <Icon name={icon} size={size} color={color} filled={filled} />
      <Label size={8} em={tracking.labelTiny} color={colors.white} style={styles.railLabel}>{label}</Label>
    </>
  );
  if (!onPress) {
    return <View accessible accessibilityLabel={accessibilityLabel} style={styles.railItem}>{content}</View>;
  }
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={styles.railItem}>
      {content}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.black, overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 340 },
  flash: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  flashIcon: { position: 'absolute' },
  // The design measures these from the bottom of the phone; the 76pt tab bar sits below this page.
  rail: { position: 'absolute', right: 16, bottom: 44, alignItems: 'center', gap: 20 },
  creator: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInitial: { ...display(17), color: colors.white },
  railItem: { alignItems: 'center' },
  railLabel: { marginTop: 4 },
  caption: { position: 'absolute', left: 20, right: 84, bottom: 28 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  follow: { borderWidth: 1, borderColor: onDark.outlineStrong, paddingVertical: 5, paddingHorizontal: 9 },
  following: { backgroundColor: colors.white, borderColor: colors.white },
  title: { ...display(26, { lineHeight: 1.12 }), color: colors.white, marginTop: 12 },
  subtitle: { ...text(14, { italic: true }), color: colors.onDarkCaption, marginTop: 8 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
});
