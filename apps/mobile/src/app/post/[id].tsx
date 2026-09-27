import { commentsFor, relativeTime, visiblePosts } from '@catalysis/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Composer } from '@/components/Composer';
import { Label } from '@/components/Label';
import { HeaderBar } from '@/components/Masthead';
import { SectionHeading } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { IconButton } from '@/components/Touchable';
import { useModeration } from '@/features/community/moderation';
import { PostCard } from '@/features/community/PostCard';
import { useNow } from '@/lib/now';
import { actions, useApp, useAppShallow } from '@/lib/store';
import { colors, spacing, text } from '@/theme';

/** A post and its replies. */
export default function PostThread() {
  const router = useRouter();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useApp((s) => visiblePosts(s).find((candidate) => candidate.id === id));
  const replies = useAppShallow((s) => commentsFor(s, id));
  const [draft, setDraft] = useState('');
  const moderation = useModeration();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/community'));

  const send = () => {
    actions().addComment(id, draft);
    setDraft('');
  };

  return (
    <Screen>
      <HeaderBar
        left={<IconButton name="chevron-left" size={20} label="Back" onPress={back} />}
        center={<Label weight="semibold" accessibilityRole="header">Thread</Label>}
      />
      {post ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <PostCard post={post} now={now} onMore={moderation.open} divider={false} />

            <View style={styles.replies}>
              <SectionHeading style={styles.heading}>Replies</SectionHeading>
              {replies.length === 0 ? (
                <EmptyState align="left" style={styles.empty}>No replies yet. Offer a word of encouragement.</EmptyState>
              ) : (
                replies.map((reply) => (
                  <View key={reply.id} style={styles.reply}>
                    <View style={styles.replyHead}>
                      <Label weight="semibold">{reply.authorName}</Label>
                      <Label size={8.5} color={colors.subtle}>{relativeTime(reply.createdAt, now)}</Label>
                    </View>
                    <Text style={styles.replyBody}>{reply.body}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          <Composer value={draft} onChangeText={setDraft} onSend={send} placeholder="Write a reply…" sendLabel="Send reply" />
        </KeyboardAvoidingView>
      ) : (
        <EmptyState>This post is no longer available.</EmptyState>
      )}
      {moderation.sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 24 },
  replies: { paddingHorizontal: spacing.pageMobile },
  heading: { paddingTop: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.ink },
  empty: { paddingHorizontal: 0, paddingVertical: 20 },
  reply: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.rule },
  replyHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  replyBody: { ...text(15.5, { lineHeight: 1.55 }), color: colors.body, marginTop: 8 },
});
