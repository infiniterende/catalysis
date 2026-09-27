import { chapterLabel, lumenPlainText, verseLabel, type ChapterRef } from '@catalysis/api';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Label } from '@/components/Label';
import { HeaderBar } from '@/components/Masthead';
import { NumberedRow, SectionHeading } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { IconButton } from '@/components/Touchable';
import { actions, useApp } from '@/lib/store';
import { colors, display, spacing } from '@/theme';

const numeral = (index: number) => String(index + 1).padStart(2, '0');
const newestFirst = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Saved verses & notes: highlights, notes, bookmarks and saved Lumen answers. */
export default function Saved() {
  const router = useRouter();
  const highlights = newestFirst(useApp((s) => s.highlights));
  const notes = newestFirst(useApp((s) => s.notes));
  const bookmarks = useApp((s) => s.bookmarks);
  const conversations = useApp((s) => s.conversations);

  const answers = conversations.flatMap((conversation) =>
    conversation.messages
      .filter((message) => message.role === 'assistant' && message.saved)
      .map((message) => ({ conversation, message })));

  const empty = highlights.length + notes.length + bookmarks.length + answers.length === 0;

  const openChapter = (ref: ChapterRef) =>
    router.push({ pathname: '/reader/[book]/[chapter]', params: { book: ref.bookId, chapter: String(ref.chapter) } });

  const openAnswer = (conversationId: string) => {
    actions().setActiveConversation(conversationId);
    router.push('/lumen');
  };

  return (
    <Screen padBottom>
      <HeaderBar
        left={<IconButton name="chevron-left" size={20} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />}
        center={<Label weight="semibold">Saved</Label>}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Label color={colors.crimson}>Kept for later</Label>
        <Text accessibilityRole="header" style={styles.title}>Verses & notes</Text>

        {empty ? (
          <EmptyState align="left" style={styles.empty}>
            Nothing saved yet. Highlight a verse or keep an answer from Lumen, and it will wait for you here.
          </EmptyState>
        ) : null}

        {highlights.length > 0 ? (
          <Section title="Highlights">
            {highlights.map((highlight, i) => (
              <NumberedRow
                key={highlight.id}
                numeral={numeral(i)}
                title={verseLabel(highlight.bookId, highlight.chapter, highlight.verseStart, highlight.verseEnd)}
                detail={highlight.text ?? 'The whole verse'}
                onPress={() => openChapter(highlight)}
              />
            ))}
          </Section>
        ) : null}

        {notes.length > 0 ? (
          <Section title="Notes">
            {notes.map((note, i) => (
              <NumberedRow
                key={note.id}
                numeral={numeral(i)}
                title={verseLabel(note.bookId, note.chapter, note.verseStart, note.verseEnd)}
                detail={note.text}
                onPress={() => openChapter(note)}
              />
            ))}
          </Section>
        ) : null}

        {bookmarks.length > 0 ? (
          <Section title="Bookmarks">
            {bookmarks.map((bookmark, i) => (
              <NumberedRow
                key={`${bookmark.bookId}-${bookmark.chapter}`}
                numeral={numeral(i)}
                title={chapterLabel(bookmark)}
                meta="Read ›"
                onPress={() => openChapter(bookmark)}
              />
            ))}
          </Section>
        ) : null}

        {answers.length > 0 ? (
          <Section title="From Lumen">
            {answers.map(({ conversation, message }, i) => (
              <NumberedRow
                key={message.id}
                numeral={numeral(i)}
                title={conversation.title}
                detail={preview(lumenPlainText(message.content))}
                onPress={() => openAnswer(conversation.id)}
              />
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function preview(value: string, max = 140): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, flat.lastIndexOf(' ', max))}…`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <SectionHeading style={styles.heading}>{title}</SectionHeading>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 22, paddingHorizontal: spacing.pageMobile, paddingBottom: 32 },
  title: { ...display(42, { italic: true, lineHeight: 1 }), color: colors.ink, marginTop: 8, paddingTop: 6 },
  empty: { paddingHorizontal: 0, paddingVertical: 28 },
  heading: { paddingTop: 26, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.ink },
});
