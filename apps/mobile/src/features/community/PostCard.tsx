import { GROUPS, relativeTime, type Post } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Label, Tag } from '@/components/Label';
import { Photo } from '@/components/Photo';
import { IconButton, Touchable } from '@/components/Touchable';
import { shareText } from '@/lib/native';
import { actions, useApp } from '@/lib/store';
import { colors, display, spacing, text } from '@/theme';

import type { ModerationTarget } from './moderation';

interface PostCardProps {
  post: Post;
  now: Date;
  /** Omitted on the thread screen, where the post is already open. */
  onOpenThread?: () => void;
  onMore: (target: ModerationTarget) => void;
  /** Draws the `rule` hairline under the card. */
  divider?: boolean;
}

function kindLabel(post: Post): string {
  const group = post.groupId ? GROUPS.find((g) => g.id === post.groupId) : undefined;
  if (group) return group.shortName;
  return post.type === 'request' ? 'Prayer request' : 'Reflection';
}

export function PostCard({ post, now, onOpenThread, onMore, divider = true }: PostCardProps) {
  const prayed = useApp((s) => s.prayedPostIds.includes(post.id));
  const prayedTotal = post.prayedCount + (prayed ? 1 : 0);

  const share = () => {
    const words = post.body ?? post.pullQuote ?? post.verse?.text ?? '';
    void shareText(`${words}\n— ${post.authorName}, on Catalysis`);
  };

  return (
    <View style={[styles.card, divider && styles.divider]}>
      <View style={styles.nameRow}>
        <Label weight="semibold" style={styles.name}>{post.authorName}</Label>
        {post.type === 'request' ? <Tag size={8.5} padV={5} padH={8}>Prayer request</Tag> : null}
        <IconButton
          name="more-horizontal"
          size={17}
          color={colors.subtle}
          label={`More options for ${post.authorName}’s post`}
          onPress={() => onMore({ kind: 'post', id: post.id, authorId: post.authorId, authorName: post.authorName })}
        />
      </View>
      <Label size={8.5} color={colors.subtle} style={styles.meta}>
        {kindLabel(post)} · {relativeTime(post.createdAt, now)}
      </Label>

      {post.pullQuote ? <Text style={styles.pullQuote}>{post.pullQuote}</Text> : null}
      {post.body ? <Text style={styles.body}>{post.body}</Text> : null}
      {post.media ? <Photo media={post.media} style={styles.photo} accessibilityLabel={`Photo shared by ${post.authorName}`} /> : null}
      {post.verse ? (
        <View style={styles.verse}>
          <Text style={styles.verseText}>{post.verse.text}</Text>
          <Label size={8.5} color={colors.muted} style={styles.verseRef}>{post.verse.label}</Label>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Touchable
          onPress={() => actions().togglePrayed(post.id)}
          accessibilityRole="button"
          accessibilityLabel={`I prayed, ${prayedTotal}`}
          accessibilityState={{ selected: prayed }}>
          <Label size={9} weight={prayed ? 'bold' : 'medium'} color={prayed ? colors.crimson : colors.muted}>
            I prayed · {prayedTotal}
          </Label>
        </Touchable>
        {onOpenThread ? (
          <Touchable onPress={onOpenThread} accessibilityRole="button" accessibilityLabel={`Reply, ${post.replyCount} replies`}>
            <Label size={9} color={colors.muted}>Reply · {post.replyCount}</Label>
          </Touchable>
        ) : (
          <Label size={9} color={colors.muted}>Reply · {post.replyCount}</Label>
        )}
        <Touchable onPress={share} accessibilityRole="button" accessibilityLabel="Share" style={styles.share}>
          <Label size={9} color={colors.muted}>Share</Label>
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 18, paddingHorizontal: spacing.pageMobile },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1 },
  meta: { marginTop: 5 },
  pullQuote: { ...display(24, { italic: true, lineHeight: 1.2 }), color: colors.ink, marginTop: 12 },
  body: { ...text(16.5, { lineHeight: 1.55 }), color: colors.body, marginTop: 12 },
  photo: { height: 170, marginTop: 12 },
  verse: { marginTop: 14, paddingVertical: 2, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.crimson },
  verseText: { ...display(18, { italic: true, lineHeight: 1.3 }), color: colors.ink },
  verseRef: { marginTop: 8 },
  actions: { flexDirection: 'row', gap: 22, marginTop: 14 },
  share: { marginLeft: 'auto' },
});
