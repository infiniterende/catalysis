import {
  allEvents, BIBLE_BOOKS, formatDayShort, GUIDED_PRAYERS, parseISODate, PEOPLE, sortEvents, visiblePosts,
} from '@catalysis/api';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Label } from '@/components/Label';
import { HeaderBar } from '@/components/Masthead';
import { NumberedRow, SectionHeading } from '@/components/Rows';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { IconButton } from '@/components/Touchable';
import { PersonRow } from '@/features/people/PersonRow';
import { useAppShallow } from '@/lib/store';
import { colors, spacing, text } from '@/theme';

const numeral = (index: number) => String(index + 1).padStart(2, '0');
const MAX_PER_GROUP = 6;

/** Search across scripture, prayers, events, people and posts. */
export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const posts = useAppShallow(visiblePosts);

  const needle = query.trim().toLowerCase();
  const matches = (...fields: (string | undefined)[]) =>
    fields.some((field) => field?.toLowerCase().includes(needle));

  const searching = needle.length >= 2;
  const books = searching ? BIBLE_BOOKS.filter((book) => matches(book.name)).slice(0, MAX_PER_GROUP) : [];
  const prayers = searching ? GUIDED_PRAYERS.filter((prayer) => matches(prayer.title)).slice(0, MAX_PER_GROUP) : [];
  const events = searching
    ? sortEvents(allEvents()).filter((event) => matches(event.title, event.location, event.note)).slice(0, MAX_PER_GROUP)
    : [];
  const people = searching
    ? PEOPLE.filter((person) => matches(person.name, person.handle, person.parish)).slice(0, MAX_PER_GROUP)
    : [];
  const found = searching
    ? posts
      .filter((post) => post.type !== 'reel' && matches(post.body, post.pullQuote, post.authorName))
      .slice(0, MAX_PER_GROUP)
    : [];

  const nothing = searching && books.length + prayers.length + events.length + people.length + found.length === 0;

  return (
    <Screen padBottom>
      <HeaderBar
        left={<IconButton name="chevron-left" size={20} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/today'))} />}
        center={<Label weight="semibold">Search</Label>}
      />
      <View style={styles.inputRow}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          placeholder="Scripture, prayers, events, people…"
          placeholderTextColor={colors.subtle}
          selectionColor={colors.crimson}
          accessibilityLabel="Search"
          style={[styles.input, query.length === 0 && styles.placeholder]}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {!searching ? (
          <EmptyState>Search the Scriptures, the prayers, and your community.</EmptyState>
        ) : null}
        {nothing ? <EmptyState>{`Nothing found for “${query.trim()}”.`}</EmptyState> : null}

        <Group title="Scripture" show={books.length > 0}>
          {books.map((book, i) => (
            <NumberedRow
              key={book.id}
              numeral={numeral(i)}
              title={book.name}
              meta={`${book.chapters} ${book.chapters === 1 ? 'chapter' : 'chapters'}`}
              onPress={() => router.push({ pathname: '/reader/[book]/[chapter]', params: { book: book.id, chapter: '1' } })}
            />
          ))}
        </Group>

        <Group title="Prayers" show={prayers.length > 0}>
          {prayers.map((prayer, i) => (
            <NumberedRow
              key={prayer.id}
              numeral={numeral(i)}
              title={prayer.title}
              meta={`${prayer.minutes} min`}
              onPress={() => router.push({ pathname: '/guided/[id]', params: { id: prayer.id } })}
            />
          ))}
        </Group>

        <Group title="Events" show={events.length > 0}>
          {events.map((event, i) => (
            <NumberedRow
              key={event.id}
              numeral={numeral(i)}
              title={event.title}
              detail={event.location}
              meta={formatDayShort(parseISODate(event.date))}
              onPress={() => router.push({ pathname: '/events', params: { date: event.date } })}
            />
          ))}
        </Group>

        <Group title="People" show={people.length > 0}>
          {people.map((person) => <PersonRow key={person.id} person={person} />)}
        </Group>

        <Group title="Posts" show={found.length > 0}>
          {found.map((post, i) => (
            <NumberedRow
              key={post.id}
              numeral={numeral(i)}
              title={post.authorName}
              detail={post.body ?? post.pullQuote}
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
            />
          ))}
        </Group>
      </ScrollView>
    </Screen>
  );
}

function Group({ title, show, children }: { title: string; show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <View>
      <SectionHeading style={styles.heading}>{title}</SectionHeading>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginHorizontal: spacing.pageMobile,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  input: { ...text(17), flex: 1, color: colors.ink, paddingVertical: 10, paddingHorizontal: 0, outlineWidth: 0 },
  placeholder: { ...text(17, { italic: true }) },
  content: { paddingHorizontal: spacing.pageMobile, paddingBottom: 32 },
  heading: { paddingTop: 24, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.ink },
});
