import {
  adjacentChapter, BibleTextError, chapterHeading, chapterLabel, chapterTitle, fetchChapter, getBook,
  verseLabel, type ChapterRef, type ChapterText, type EditionId,
} from '@catalysis/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextLink } from '@/components/Buttons';
import { Label } from '@/components/Label';
import { HeaderBar } from '@/components/Masthead';
import { Screen } from '@/components/Screen';
import { EmptyState, SkeletonLines } from '@/components/States';
import { IconButton, Touchable } from '@/components/Touchable';
import { Passage } from '@/features/reader/Passage';
import { ExplainSheet, NoteSheet, TypeSheet } from '@/features/reader/ReaderSheets';
import { shareText } from '@/lib/native';
import { actions, useApp, useAppShallow } from '@/lib/store';
import { colors, display, spacing, text } from '@/theme';

type Loaded =
  | { key: string; chapter: ChapterText; error?: undefined }
  | { key: string; chapter?: undefined; error: { message: string; retry: boolean } };

type OpenSheet = 'type' | 'note' | 'explain' | null;

/** 04 · Bible Reader. Full screen, with its own pager instead of the tab bar. */
export default function Reader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book: string; chapter: string }>();

  const bookId = (params.book ?? 'JHN').toUpperCase();
  const chapterNumber = Number.parseInt(params.chapter ?? '1', 10) || 1;
  const book = getBook(bookId);
  const ref: ChapterRef = { bookId: book?.id ?? bookId, chapter: chapterNumber };

  // The edition the reader asked for, remembered per chapter.
  const [preferred, setPreferred] = useState<{ chapter: string; edition: EditionId } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<{ chapter: string; verse: number } | null>(null);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [viewport, setViewport] = useState(0);
  const [passageEnd, setPassageEnd] = useState(0);

  const chapterKey = `${ref.bookId}/${ref.chapter}`;
  const edition = preferred?.chapter === chapterKey ? preferred.edition : undefined;
  const requestKey = `${chapterKey}/${edition ?? 'default'}/${attempt}`;

  const reader = useApp((s) => s.reader);
  const bookmarked = useApp((s) => s.bookmarks.some((b) => b.bookId === ref.bookId && b.chapter === ref.chapter));
  const highlights = useAppShallow((s) =>
    s.highlights.filter((h) => h.bookId === ref.bookId && h.chapter === ref.chapter));
  const notes = useAppShallow((s) => s.notes.filter((n) => n.bookId === ref.bookId && n.chapter === ref.chapter));

  useEffect(() => {
    const controller = new AbortController();
    fetchChapter({ bookId: ref.bookId, chapter: ref.chapter }, { edition, signal: controller.signal })
      .then((chapter) => {
        if (controller.signal.aborted) return;
        setLoaded({ key: requestKey, chapter });
        // Only a chapter that actually opened becomes the place to resume from.
        actions().setReading(chapter.ref);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const known = error instanceof BibleTextError;
        setLoaded({
          key: requestKey,
          error: {
            message: known ? error.message : 'The text could not be loaded just now.',
            retry: !known || error.reason === 'network',
          },
        });
      });
    return () => controller.abort();
  }, [ref.bookId, ref.chapter, edition, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const chapter = current?.chapter;
  const selectedVerse = selected?.chapter === chapterKey ? selected.verse : null;
  const verse = chapter?.verses.find((v) => v.number === selectedVerse);
  const verseRef = verse ? verseLabel(ref.bookId, ref.chapter, verse.number) : '';
  const verseHighlighted = verse
    ? highlights.some((h) => verse.number >= h.verseStart && verse.number <= h.verseEnd)
    : false;
  const verseNote = verse ? notes.find((n) => n.verseStart === verse.number) : undefined;

  const previous = adjacentChapter(ref, -1);
  const next = adjacentChapter(ref, 1);

  const go = (target: ChapterRef | undefined) => {
    if (!target) return;
    setSheet(null);
    router.setParams({ book: target.bookId, chapter: String(target.chapter) });
  };

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      if (event.translationX <= -64) go(next);
      else if (event.translationX >= 64) go(previous);
    });

  const toggleHighlight = () => {
    if (!verse) return;
    if (verseHighlighted) actions().removeHighlights(ref.bookId, ref.chapter, verse.number);
    else actions().addHighlight({ bookId: ref.bookId, chapter: ref.chapter, verseStart: verse.number, verseEnd: verse.number });
  };

  const share = () => {
    if (!verse || !chapter) return;
    void shareText(`“${verse.text}”\n${verseRef} · ${chapter.edition.short}`);
  };

  const toolbar = verse ? (
    <View style={styles.toolbar} accessibilityRole="toolbar">
      <ToolbarAction
        label="Highlight"
        accessibilityLabel={verseHighlighted ? 'Remove highlight' : 'Highlight'}
        onPress={toggleHighlight}
      />
      <ToolbarAction label="Note" onPress={() => setSheet('note')} />
      <ToolbarAction label="Explain" onPress={() => setSheet('explain')} />
      <ToolbarAction label="Share" onPress={share} />
    </View>
  ) : null;

  // As drawn, the toolbar follows the passage. In a chapter too long for that
  // to stay in view, it is pinned above the pager instead.
  const pinToolbar = passageEnd + TOOLBAR_SPACE > viewport;

  return (
    <Screen tone="reader">
      <HeaderBar
        left={<IconButton name="chevron-left" size={20} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/scripture'))} />}
        center={
          <>
            <Label weight="semibold" accessibilityRole="header">{chapterHeading(ref)}</Label>
            <Text style={styles.edition} numberOfLines={1}>{chapter?.edition.name ?? ' '}</Text>
          </>
        }
        right={
          <>
            <IconButton name="type" label="Text size and spacing" onPress={() => setSheet('type')} />
            <IconButton
              name="bookmark"
              label={bookmarked ? 'Remove bookmark' : 'Bookmark this chapter'}
              filled={bookmarked}
              selected={bookmarked}
              onPress={() => actions().toggleBookmark(ref)}
            />
          </>
        }
      />

      <GestureDetector gesture={swipe}>
        <View style={styles.fill} onLayout={(event) => setViewport(event.nativeEvent.layout.height)}>
          <ScrollView
            key={chapterKey}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <View onLayout={(event) => setPassageEnd(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
              <Label color={colors.crimson}>{book?.kicker ?? 'Sacred Scripture'}</Label>
              <Text accessibilityRole="header" style={styles.title}>{book?.title ?? bookId}</Text>
              <View style={styles.chapterLabel}>
                <Label size={9} color={colors.muted}>{chapterTitle(ref, chapter?.title)}</Label>
              </View>

              <View style={styles.passage}>
                {chapter ? (
                  <Passage
                    verses={chapter.verses}
                    highlights={highlights}
                    selectedVerse={selectedVerse}
                    onSelectVerse={(number) => setSelected(number === null ? null : { chapter: chapterKey, verse: number })}
                    scale={reader.scale}
                    spacing={reader.spacing}
                  />
                ) : current?.error ? (
                  <EmptyState
                    align="left"
                    style={styles.error}
                    action={current.error.retry
                      ? <TextLink label="Try again" onPress={() => setAttempt((n) => n + 1)} />
                      : undefined}>
                    {current.error.message}
                  </EmptyState>
                ) : (
                  <SkeletonLines lines={9} gap={17} />
                )}
              </View>
            </View>

            {pinToolbar ? null : toolbar ? <View style={styles.toolbarInline}>{toolbar}</View> : null}

            {chapter?.excerpt ? (
              <View style={styles.excerpt}>
                <Text style={styles.excerptNote}>
                  Excerpt from the RSV-CE. The complete text will appear here once licensed.
                </Text>
                <TextLink
                  label="Read the full chapter in Douay-Rheims"
                  onPress={() => setPreferred({ chapter: chapterKey, edition: 'dra' })}
                />
              </View>
            ) : null}
          </ScrollView>

          {pinToolbar && toolbar ? <View style={styles.toolbarPinned}>{toolbar}</View> : null}
        </View>
      </GestureDetector>

      <View style={[styles.pager, { height: spacing.readerPager + insets.bottom, paddingBottom: insets.bottom }]}>
        <PagerLink
          label={previous ? `‹ ${chapterLabel(previous)}` : ''}
          color={colors.muted}
          align="flex-start"
          onPress={previous ? () => go(previous) : undefined}
        />
        <PagerLink label="Contents" weight="semibold" align="center" onPress={() => router.navigate('/scripture')} />
        <PagerLink
          label={next ? `${chapterLabel(next)} ›` : ''}
          align="flex-end"
          onPress={next ? () => go(next) : undefined}
        />
      </View>

      <TypeSheet
        visible={sheet === 'type'}
        onClose={() => setSheet(null)}
        settings={reader}
        onChange={(patch) => actions().setReader(patch)}
      />
      {sheet === 'note' && verse ? (
        <NoteSheet
          reference={verseRef}
          initialText={verseNote?.text ?? ''}
          onClose={() => setSheet(null)}
          onSave={(value) =>
            actions().saveNote({
              bookId: ref.bookId, chapter: ref.chapter, verseStart: verse.number, verseEnd: verse.number, text: value,
            })}
        />
      ) : null}
      {sheet === 'explain' && verse ? (
        <ExplainSheet passage={{ reference: verseRef, text: verse.text }} onClose={() => setSheet(null)} />
      ) : null}
    </Screen>
  );
}

interface ToolbarActionProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

function ToolbarAction({ label, onPress, accessibilityLabel = label }: ToolbarActionProps) {
  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Label size={9} color={colors.white}>{label}</Label>
    </Touchable>
  );
}

interface PagerLinkProps {
  label: string;
  onPress?: () => void;
  color?: string;
  weight?: 'medium' | 'semibold';
  align: 'flex-start' | 'center' | 'flex-end';
}

function PagerLink({ label, onPress, color = colors.ink, weight = 'medium', align }: PagerLinkProps) {
  if (!onPress) return <View style={styles.pagerSlot} />;
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label.replace(/[‹›]/g, '').trim()}
      style={[styles.pagerSlot, { alignItems: align }]}>
      <Label size={9} color={color} weight={weight} numberOfLines={1}>{label}</Label>
    </Touchable>
  );
}

/** Height the inline toolbar needs below the passage, margins included. */
const TOOLBAR_SPACE = 20 + 44 + 24;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  edition: { ...text(12, { italic: true }), color: colors.muted, marginTop: 3 },
  content: { paddingTop: 26, paddingHorizontal: 26, paddingBottom: 40 },
  title: { ...display(52, { medium: true, lineHeight: 1 }), color: colors.ink, marginTop: 8, paddingTop: 6 },
  chapterLabel: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.ink },
  passage: { marginTop: 18 },
  error: { paddingHorizontal: 0, paddingVertical: 8 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toolbarInline: { marginTop: 20 },
  toolbarPinned: { position: 'absolute', left: 26, right: 26, bottom: 14 },
  excerpt: { marginTop: 26, gap: 14 },
  excerptNote: { ...text(13.5, { italic: true, lineHeight: 1.5 }), color: colors.subtle },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: colors.paperReader,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
  },
  pagerSlot: { flex: 1 },
});
