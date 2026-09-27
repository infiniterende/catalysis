import {
  booksOf, chapterLabel, roman, type BibleBook, type ChapterRef, type Testament,
} from '@catalysis/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Label } from '@/components/Label';
import { NumberedRow } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { Touchable } from '@/components/Touchable';
import { useApp } from '@/lib/store';
import { colors, display, spacing, text } from '@/theme';

const TESTAMENTS = [
  { key: 'New Testament', label: 'New Testament' },
  { key: 'Old Testament', label: 'Old Testament' },
] as const satisfies readonly { key: Testament; label: string }[];

/** Scripture tab: the table of contents. */
export default function Scripture() {
  const router = useRouter();
  const reading = useApp((s) => s.reading);
  const [testament, setTestament] = useState<Testament>('New Testament');
  const [openBook, setOpenBook] = useState<string | null>(null);

  const open = (ref: ChapterRef) =>
    router.push({
      pathname: '/reader/[book]/[chapter]',
      params: { book: ref.bookId, chapter: String(ref.chapter) },
    });

  const changeTestament = (next: Testament) => {
    setTestament(next);
    setOpenBook(null);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Label color={colors.crimson}>Sacred Scripture</Label>
          <Text accessibilityRole="header" style={styles.title}>Scripture</Text>
          <Text style={styles.deck}>Read, mark, and return.</Text>
        </View>

        <Label weight="semibold" accessibilityRole="header" style={styles.continueHeading}>Continue reading</Label>
        <View style={styles.continue}>
          <NumberedRow
            numeral={roman(reading.chapter)}
            numeralSize={24}
            numeralWidth={44}
            title={chapterLabel(reading)}
            titleStyle={styles.continueTitle}
            meta={<Label size={9}>Resume ›</Label>}
            align="center"
            padV={13}
            onPress={() => open(reading)}
            accessibilityLabel={`Continue reading ${chapterLabel(reading)}`}
          />
        </View>

        <Tabs tabs={TESTAMENTS} value={testament} onChange={changeTestament} style={styles.tabs} />

        {booksOf(testament).map((book) => (
          <BookRow
            key={book.id}
            book={book}
            reading={reading}
            expanded={openBook === book.id}
            onToggle={() => setOpenBook((current) => (current === book.id ? null : book.id))}
            onOpen={open}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

interface BookRowProps {
  book: BibleBook;
  reading: ChapterRef;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (ref: ChapterRef) => void;
}

function BookRow({ book, reading, expanded, onToggle, onOpen }: BookRowProps) {
  const current = reading.bookId === book.id;
  return (
    <View style={styles.book}>
      <Touchable
        hitSlop={undefined}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={current ? `${book.name}, reading chapter ${reading.chapter}` : book.name}
        accessibilityState={{ expanded }}
        style={styles.bookRow}>
        <Text style={current || expanded ? styles.bookNameActive : styles.bookName}>{book.name}</Text>
        {current ? <Text style={styles.bookNumeral}>{roman(reading.chapter)}</Text> : null}
      </Touchable>

      {expanded ? (
        <View style={styles.chapters}>
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => {
            const selected = current && reading.chapter === chapter;
            return (
              <Touchable
                key={chapter}
                hitSlop={undefined}
                onPress={() => onOpen({ bookId: book.id, chapter })}
                accessibilityRole="button"
                accessibilityLabel={`${book.name} ${chapter}`}
                accessibilityState={{ selected }}
                style={[styles.chapter, selected && styles.chapterSelected]}>
                <Text style={[styles.chapterNumeral, selected && styles.chapterNumeralSelected]}>{chapter}</Text>
              </Touchable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.pageMobile, paddingBottom: 36 },
  header: { paddingTop: 10 },
  title: { ...display(54, { italic: true, lineHeight: 1 }), color: colors.ink, marginTop: 8, paddingTop: 6 },
  deck: { ...text(15, { italic: true }), color: colors.muted, marginTop: 8 },
  continueHeading: { marginTop: 24 },
  continue: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.ink },
  continueTitle: { ...text(16, { bold: true }), color: colors.ink },
  tabs: { marginTop: 26 },
  book: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  bookRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 11 },
  bookName: { ...text(16), color: colors.muted },
  bookNameActive: { ...text(16, { bold: true }), color: colors.ink },
  bookNumeral: { ...display(16), color: colors.crimson },
  chapters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2, paddingBottom: 14 },
  chapter: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chapterNumeral: { ...display(16), color: colors.ink },
  chapterNumeralSelected: { color: colors.white },
});
