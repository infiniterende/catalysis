import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adjacentChapter, BIBLE_BOOKS, buildMonthGrid, buildRule, buildSeed, buildWeek, chapterTitle, compactCount,
  computeStreak, createAppStore, createProseFilter, DEMO_USER, easterSunday, formatDayShort, formatHour,
  formatTime12, getLiturgicalDay, localAuth, META_MARKER, nextEvent, EVENTS, parseLumenBlocks, prayedCount,
  allTimePrayers, roman, segmentVerse, splitReply, toISODate, DEFAULT_PRAYERS, defaultEditionShort, fetchChapter,
  setBibleSource, verseRuns, weeklyPizzaAndPews, parseISODate, buildMonth, longestStreak, bestStreak, verseRanges, versesLabel,
  chapterOf, compactChanges, feedReels, findPrayer, GUIDED_PRAYERS, journalFor, rosaryFor,
  searchPrayerBook, TONIGHT, type Change, followerCount, followersOf, groupFor, groupsToJoin, memberCount, milestonesFor, myGroups, personFor, postsBy,
} from './index.ts';

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

test('formatting', () => {
  assert.equal(formatDayShort(new Date(2026, 8, 26)), 'Sat 26 Sept');
  assert.equal(formatTime12('17:30'), '5:30 PM');
  assert.equal(formatTime12('00:05'), '12:05 AM');
  assert.equal(formatHour('21:00'), '9 PM');
  assert.equal(compactCount(2400), '2.4k');
  assert.equal(compactCount(980), '980');
  assert.equal(roman(14), 'XIV');
  assert.equal(chapterTitle({ bookId: 'JHN', chapter: 1 }, 'The Word Became Flesh'), 'Chapter One — The Word Became Flesh');
  assert.equal(chapterTitle({ bookId: 'PSA', chapter: 23 }), 'Psalm Twenty-Three');
});

test('bible canon', () => {
  assert.equal(BIBLE_BOOKS.length, 73);
  assert.equal(BIBLE_BOOKS.filter((b) => b.testament === 'New Testament').length, 27);
  assert.deepEqual(adjacentChapter({ bookId: 'JHN', chapter: 1 }, -1), { bookId: 'LUK', chapter: 24 });
  assert.deepEqual(adjacentChapter({ bookId: 'JHN', chapter: 1 }, 1), { bookId: 'JHN', chapter: 2 });
  assert.equal(adjacentChapter({ bookId: 'REV', chapter: 22 }, 1), undefined);
  assert.equal(adjacentChapter({ bookId: 'GEN', chapter: 1 }, -1), undefined);
});

test('bible source', async () => {
  // Before a source is registered the reader falls back to the design's excerpt.
  const excerpt = await fetchChapter({ bookId: 'JHN', chapter: 1 });
  assert.equal(excerpt.edition.id, 'rsv-ce');
  assert.equal(defaultEditionShort(), 'RSV-CE');

  setBibleSource(async (id) =>
    id === 'JHN'
      ? {
          chapters: [[
            { n: 1, t: 'In the beginning was the Word.', h: ['I. Prologue'] },
            { n: 2, t: 'One part. Another part.', h: ['A Heading'], m: [{ at: 10, h: ['Within'] }] },
          ]],
        }
      : undefined,
  );
  const chapter = await fetchChapter({ bookId: 'JHN', chapter: 1 });
  assert.equal(chapter.edition.id, 'nabre');
  assert.equal(chapter.title, 'Prologue');
  assert.equal(chapter.verses[0]?.headings, undefined);
  assert.deepEqual(chapter.verses[1]?.headings, ['A Heading']);
  assert.equal(defaultEditionShort(), 'NABRE');
  await assert.rejects(fetchChapter({ bookId: 'JHN', chapter: 2 }), /not available/);
  await assert.rejects(fetchChapter({ bookId: 'GEN', chapter: 1 }), /not available/);

  const verse = chapter.verses[1];
  assert.ok(verse);
  assert.deepEqual(verseRuns(verse, []), [
    { kind: 'text', text: 'One part. ', highlighted: false, start: 0 },
    { kind: 'headings', headings: ['Within'] },
    { kind: 'text', text: 'Another part.', highlighted: false, start: 10 },
  ]);
  assert.deepEqual(verseRuns(verse, ['part. Another']).map((r) => (r.kind === 'text' ? [r.text, r.highlighted] : r.headings)), [
    ['One ', false],
    ['part. ', true],
    ['Within'],
    ['Another', true],
    [' part.', false],
  ]);
});

test('verse segments', () => {
  const text = 'In him was life, and the life was the light of men.';
  assert.deepEqual(segmentVerse(text, ['the life was the light of men.']), [
    { text: 'In him was life, and ', highlighted: false },
    { text: 'the life was the light of men.', highlighted: true },
  ]);
  assert.deepEqual(segmentVerse(text, [undefined]), [{ text, highlighted: true }]);
  assert.deepEqual(segmentVerse(text, []), [{ text, highlighted: false }]);
  assert.deepEqual(segmentVerse(text, [{ text: 'In him', color: 'a3' }]), [
    { text: 'In him', highlighted: true, color: 'a3' },
    { text: ' was life, and the life was the light of men.', highlighted: false },
  ]);
});

test('calendar grid', () => {
  const sept = buildMonthGrid(2026, 8);
  assert.equal(sept.length, 5);
  assert.deepEqual(sept[0]?.map((c) => c.day), [30, 31, 1, 2, 3, 4, 5]);
  assert.deepEqual(sept[4]?.map((c) => c.day), [27, 28, 29, 30, 1, 2, 3]);
  assert.equal(nextEvent(EVENTS, '2026-09-26')?.id, 'e-pizza-2026-09-27');
  assert.equal(nextEvent(EVENTS, '2026-09-28')?.id, 'e-adoration');

  // Pizza and Pews is every Sunday at eight, and only on Sundays.
  const pizza = EVENTS.filter((e) => e.title === 'Pizza and Pews');
  assert.ok(pizza.length > 30);
  assert.ok(pizza.every((e) => parseISODate(e.date).getDay() === 0 && e.time === '20:00'));
  assert.deepEqual(weeklyPizzaAndPews('2026-09-01', '2026-09-30').map((e) => e.date), ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27']);
  assert.equal(EVENTS.some((e) => /Theology/.test(e.title)), false);
});

test('liturgical calendar', () => {
  assert.equal(toISODate(easterSunday(2026)), '2026-04-05');
  assert.equal(toISODate(easterSunday(2027)), '2027-03-28');
  const day = (iso: string) => getLiturgicalDay(iso);
  assert.equal(day('2026-09-26').celebration, 'Memorial of Sts. Cosmas & Damian');
  assert.equal(day('2026-09-27').celebration, 'Twenty-Sixth Sunday in Ordinary Time');
  assert.equal(day('2026-09-29').celebration, 'Feast of Sts. Michael, Gabriel & Raphael');
  assert.equal(day('2026-09-29').shortName, 'The Archangels');
  assert.equal(day('2026-09-08').shortName, 'Nativity of Mary');
  assert.equal(day('2026-09-14').shortName, 'Exaltation of the Cross');
  assert.equal(day('2026-02-18').celebration, 'Ash Wednesday');
  assert.equal(day('2026-03-29').shortName, 'Palm Sunday');
  assert.equal(day('2026-04-03').shortName, 'Good Friday');
  assert.equal(day('2026-05-14').shortName, 'The Ascension');
  assert.equal(day('2026-05-24').shortName, 'Pentecost');
  assert.equal(day('2026-05-25').shortName, 'Mary, Mother of the Church');
  assert.equal(day('2026-05-26').celebration, 'Memorial of St. Philip Neri');
  assert.equal(day('2026-06-07').shortName, 'Corpus Christi');
  assert.equal(day('2026-11-22').shortName, 'Christ the King');
  assert.equal(day('2026-11-29').celebration, 'First Sunday of Advent');
  assert.equal(day('2026-12-08').shortName, 'Immaculate Conception');
  assert.equal(day('2026-12-25').shortName, 'Christmas');
  assert.equal(day('2026-12-27').shortName, 'The Holy Family');
  assert.equal(day('2026-01-04').shortName, 'The Epiphany');
  assert.equal(day('2026-01-11').shortName, 'Baptism of the Lord');
  assert.equal(day('2026-01-18').celebration, 'Second Sunday in Ordinary Time');
  assert.equal(day('2026-02-22').celebration, 'First Sunday of Lent');
  assert.equal(day('2026-03-19').shortName, 'St. Joseph');
  // A memorial gives way to a Lenten weekday; the Annunciation in Holy Week moves after the Easter octave.
  assert.equal(day('2027-03-25').shortName, 'Holy Thursday');
  assert.equal(day('2027-04-05').shortName, 'The Annunciation');
  // Immaculate Conception on an Advent Sunday moves to Monday.
  assert.equal(day('2024-12-08').celebration, 'Second Sunday of Advent');
  assert.equal(day('2024-12-09').shortName, 'Immaculate Conception');
});

test('streak and week', () => {
  const now = new Date(2026, 8, 26, 18, 0);
  const seed = buildSeed(now);
  assert.equal(computeStreak(seed.prayerLogs, '2026-09-26'), 12);
  // Tomorrow morning, before any prayer, the streak still stands.
  assert.equal(computeStreak(seed.prayerLogs, '2026-09-27'), 12);
  assert.equal(computeStreak(seed.prayerLogs, '2026-09-28'), 0);
  const week = buildWeek(seed.prayerLogs, '2026-09-26', 4);
  assert.deepEqual(week.map((d) => d.state), ['done', 'done', 'done', 'done', 'done', 'today', 'future']);
  assert.equal(week[5]?.progress, 0.75);
  const rule = buildRule(DEFAULT_PRAYERS, seed.prayerLogs, '2026-09-26');
  assert.deepEqual(rule.map((r) => r.done), [true, true, true, false]);
  assert.equal(rule[3]?.next, true);

  assert.equal(longestStreak(seed.prayerLogs), 16);
  const month = buildMonth(seed.prayerLogs, '2026-09-26', 4);
  assert.equal(month.length, 30);
  assert.deepEqual(month.slice(24).map((d) => d.state), ['past', 'today', 'future', 'future', 'future', 'future']);
  assert.equal(month[25]?.progress, 0.75);
  assert.equal(month[13]?.progress, 0);
});

test('store', async () => {
  const store = createAppStore(memoryStorage());
  const now = new Date(2026, 8, 26, 18, 0);
  const result = await localAuth.signIn({ email: 'maria.acosta@nyu.edu', password: 'correct horse' });
  assert.ok(result.ok);
  store.getState().startSession(result.user, now);
  const s = () => store.getState();
  assert.equal(s().user?.id, DEMO_USER.id);
  assert.equal(allTimePrayers(s()), 342);
  assert.equal(bestStreak(s()), 31);

  const jacob = s().posts.find((p) => p.id === 'post-jacob');
  assert.ok(jacob);
  assert.equal(prayedCount(s(), jacob), 24);
  s().togglePrayed('post-jacob');
  assert.equal(prayedCount(s(), jacob), 23);

  s().togglePrayer('p-examen', now);
  assert.equal(buildRule(s().prayers, s().prayerLogs, '2026-09-26').filter((r) => r.done).length, 4);
  assert.equal(allTimePrayers(s()), 343);
  s().togglePrayer('p-examen', now);
  assert.equal(allTimePrayers(s()), 342);

  s().toggleRsvp('e-pizza-2026-09-27');
  assert.ok(s().rsvpEventIds.includes('e-pizza-2026-09-27'));

  const post = s().addPost({ type: 'reflection', body: '  Peace be with you.  ', audience: 'everyone' }, now);
  assert.equal(post?.body, 'Peace be with you.');
  assert.equal(s().posts[0]?.id, post?.id);
  s().reportPost('post-ana');
  assert.ok(!s().hiddenPostIds.includes('post-jacob') && s().hiddenPostIds.includes('post-ana'));

  s().signOut();
  assert.equal(s().user, null);
  assert.equal(s().posts.length, 0);
});

test('highlights across verses', () => {
  const store = createAppStore(memoryStorage());
  const s = () => store.getState();
  const at = { bookId: 'JHN', chapter: 3 };
  s().addHighlight({ ...at, verseStart: 14, verseEnd: 18, color: 'a2' });
  s().addHighlight({ ...at, verseStart: 16, verseEnd: 16, text: 'so loved the world', color: 'a3' });
  s().addHighlight({ ...at, verseStart: 20, verseEnd: 21, color: 'a5' });
  s().addHighlight({ bookId: 'JHN', chapter: 4, verseStart: 16, verseEnd: 16, color: 'a2' });
  const shape = () => s().highlights.map((h) => `${h.chapter}:${h.verseStart}-${h.verseEnd}${h.text ? '*' : ''}/${h.color}`).sort();

  // Clearing whole-verse highlighting in the middle of a run splits it and spares the phrase.
  s().clearHighlights('JHN', 3, [16], 'whole');
  assert.deepEqual(shape(), ['3:14-15/a2', '3:16-16*/a3', '3:17-18/a2', '3:20-21/a5', '4:16-16/a2']);

  // Clearing everything on some verses leaves the rest, and other chapters, untouched.
  s().clearHighlights('JHN', 3, [15, 16, 17, 20]);
  assert.deepEqual(shape(), ['3:14-14/a2', '3:18-18/a2', '3:21-21/a5', '4:16-16/a2']);

  assert.deepEqual(verseRanges([5, 3, 4, 9, 9]), [[3, 5], [9, 9]]);
  assert.equal(versesLabel('JHN', 3, [16, 17, 18]), 'John 3:16–18');
  assert.equal(versesLabel('JHN', 3, [16, 18, 19]), 'John 3:16, 18–19');
});

test('auth validation', async () => {
  const bad = await localAuth.signIn({ email: 'nope', password: 'short' });
  assert.ok(!bad.ok);
  assert.ok(bad.errors.email && bad.errors.password);
  const created = await localAuth.signUp({ name: 'Thomas More', email: 'Thomas@Example.com', password: 'a-long-password' });
  assert.ok(created.ok);
  assert.equal(created.user.email, 'thomas@example.com');
  assert.equal(created.user.handle, '@thomas');
});

test('lumen protocol', () => {
  const reply = `First paragraph.\n\n> “A quotation.”\n> — CCC 2838–2845\n\nSecond paragraph.\n${META_MARKER}\n{"sources":[{"type":"Catechism","reference":"CCC 2838–2845","description":"Fifth petition"},{"type":"Nonsense","reference":""}],"followUps":["Yes, a prayer","A related passage","Three","Four"]}`;
  const { content, citations, followUps } = splitReply(reply);
  assert.deepEqual(parseLumenBlocks(content), [
    { kind: 'paragraph', text: 'First paragraph.' },
    { kind: 'quote', text: '“A quotation.”', citation: 'CCC 2838–2845' },
    { kind: 'paragraph', text: 'Second paragraph.' },
  ]);
  assert.equal(citations.length, 1);
  assert.equal(followUps.length, 3);

  // The marker never leaks, however the stream is chunked.
  for (const size of [1, 3, 7, 50]) {
    const filter = createProseFilter();
    let out = '';
    for (let i = 0; i < reply.length; i += size) out += filter.push(reply.slice(i, i + size));
    assert.equal(out.trim(), content, `chunk size ${size}`);
    assert.equal(filter.full(), reply);
  }
  assert.deepEqual(splitReply('not json' + META_MARKER + '{oops').citations, []);
});

test('prayer journal', () => {
  const changes: Change[] = [];
  const store = createAppStore(memoryStorage(), 'journal-test', { onChange: (c) => changes.push(c) });
  const s = () => store.getState();
  const monday = new Date(2026, 8, 28, 9, 0);

  assert.equal(s().saveJournalEntry({ kind: 'free', body: '   ' }, monday), undefined, 'an empty entry is not kept');
  const first = s().saveJournalEntry({ kind: 'petition', title: ' For exams ', body: 'Peace, please.' }, monday);
  assert.ok(first);
  assert.equal(first.title, 'For exams');
  assert.equal(first.date, '2026-09-28');
  s().saveJournalEntry({ kind: 'gratitude', body: 'Sunshine.', date: '2026-09-30' }, monday);
  assert.deepEqual(s().journal.map((e) => e.date), ['2026-09-30', '2026-09-28'], 'newest day first');

  // Editing keeps the entry's identity and the day it was written.
  const edited = s().saveJournalEntry({ id: first.id, kind: 'petition', body: 'Peace and focus.' }, new Date(2026, 8, 29, 8, 0));
  assert.equal(edited?.id, first.id);
  assert.equal(edited?.createdAt, first.createdAt);
  assert.equal(edited?.date, '2026-09-28');
  assert.equal(s().journal.length, 2);

  s().toggleAnswered(first.id, new Date(2026, 9, 2, 8, 0));
  assert.equal(s().journal.find((e) => e.id === first.id)?.answeredOn, '2026-10-02');
  // Only a petition can be answered.
  s().saveJournalEntry({ id: first.id, kind: 'free', body: 'Peace and focus.' }, monday);
  assert.equal(s().journal.find((e) => e.id === first.id)?.answeredOn, undefined);

  assert.equal(journalFor(s(), { query: 'sunshine' }).length, 1);
  assert.equal(journalFor(s(), { kind: 'free' }).length, 1);

  s().deleteJournalEntry(first.id);
  assert.equal(s().journal.length, 1);
  assert.deepEqual(changes.map((c) => c.type), ['journal.save', 'journal.save', 'journal.save', 'journal.save', 'journal.save', 'journal.delete']);
  assert.equal(compactChanges(changes).filter((c) => c.type === 'journal.save').length, 2, 'one save per entry survives');
});

test('prayer book', () => {
  const ids = GUIDED_PRAYERS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const prayer of DEFAULT_PRAYERS) assert.ok(findPrayer(prayer.guidedContentId ?? ''), `${prayer.title} is in the book`);
  assert.ok(findPrayer(TONIGHT.guidedId));
  for (const prayer of GUIDED_PRAYERS) {
    assert.ok(prayer.steps.length > 0, prayer.id);
    for (const step of prayer.steps) if (step.scripture) assert.ok(chapterOf(step.scripture), `${step.scripture} resolves`);
  }
  assert.equal(findPrayer('g-stations')?.prayer.steps.length, 14);
  // Two opening steps, five mysteries, one closing.
  assert.equal(rosaryFor('2026-09-27').steps.length, 8);
  assert.equal(rosaryFor('2026-09-27').id, 'g-rosary', 'Sunday: Glorious');
  assert.equal(rosaryFor('2026-09-28').id, 'g-rosary-joyful', 'Monday: Joyful');
  assert.equal(rosaryFor('2026-09-29').id, 'g-rosary-sorrowful', 'Tuesday: Sorrowful');
  assert.equal(rosaryFor('2026-10-01').id, 'g-rosary-luminous', 'Thursday: Luminous');
  assert.deepEqual(chapterOf('1 Corinthians 13:4-7'), { bookId: '1CO', chapter: 13 });
  assert.equal(chapterOf('Hezekiah 3:16'), undefined);
  assert.ok(searchPrayerBook('trespass').some((p) => p.id === 'g-our-father'));
});

test('TikTok videos join the reels feed', () => {
  const store = createAppStore(memoryStorage(), 'tiktok-test');
  store.getState().startSession({ ...DEMO_USER, id: 'u-someone' });
  const before = feedReels(store.getState(), 'forYou').length;
  store.getState().setTikTok([
    { id: '7300000000000000001', url: 'https://www.tiktok.com/@example/video/7300000000000000001', handle: 'example', authorName: 'Example', caption: 'On the Rosary', topic: 'Prayer', approvedAt: '2026-09-27T12:00:00.000Z' },
  ]);
  const reels = feedReels(store.getState(), 'forYou');
  assert.equal(reels.length, before + 1);
  assert.equal(reels[0]?.id, 'tt-7300000000000000001');
  assert.equal(reels[0]?.tiktok?.handle, 'example');
  // Reporting one hides it for that member.
  store.getState().reportReel('tt-7300000000000000001');
  assert.equal(feedReels(store.getState(), 'forYou').length, before);
});

test('feed reels are stable between reads', () => {
  const store = createAppStore(memoryStorage(), 'stable-test');
  store.getState().startSession({ ...DEMO_USER, id: 'u-someone' });
  store.getState().addPost({ type: 'reel', body: 'My reel', audience: 'everyone' });
  store.getState().setTikTok([
    { id: '7300000000000000002', url: 'https://www.tiktok.com/@example/video/7300000000000000002', handle: 'example', authorName: 'Example', caption: 'Lectio', topic: 'Prayer', approvedAt: '2026-09-27T12:00:00.000Z' },
  ]);
  const first = feedReels(store.getState(), 'forYou');
  const second = feedReels(store.getState(), 'forYou');
  assert.ok(first.length >= 2);
  first.forEach((reel, i) => assert.equal(reel, second[i], `${reel.id} is the same object`));
});

test('groups and followers', () => {
  const changes: Change[] = [];
  const store = createAppStore(memoryStorage(), 'groups-test', { onChange: (c) => changes.push(c) });
  const s = () => store.getState();
  s().startSession({ ...DEMO_USER, id: 'u-me', name: 'Me', handle: '@me' });

  assert.ok(!s().createGroup({ name: 'ab' }).ok, 'too short');
  assert.ok(!s().createGroup({ name: 'Newman Center, NYU' }).ok, 'name already taken');
  const made = s().createGroup({ name: '  Rosary   Walkers, Thursdays ', description: ' We walk and pray. ' });
  assert.ok(made.ok);
  assert.equal(made.group.name, 'Rosary Walkers, Thursdays');
  assert.equal(made.group.shortName, 'Rosary Walkers');
  assert.equal(made.group.description, 'We walk and pray.');
  assert.ok(s().joinedGroupIds.includes(made.group.id), 'the founder is a member');
  assert.equal(memberCount(s(), made.group), 1);
  assert.equal(myGroups(s())[0]?.id, made.group.id);
  assert.ok(groupsToJoin(s()).every((g) => g.id !== made.group.id));

  // Only the founder can close a group; its posts stay.
  s().deleteGroup('g-newman');
  assert.ok(groupFor(s(), 'g-newman'));
  const post = s().addPost({ type: 'reflection', body: 'Hello', groupId: made.group.id, audience: 'parish' });
  s().deleteGroup(made.group.id);
  assert.equal(groupFor(s(), made.group.id), undefined);
  assert.equal(s().posts.find((p) => p.id === post?.id)?.groupId, undefined);
  assert.deepEqual(changes.map((c) => c.type), ['group.create', 'post.create', 'group.delete']);

  // Followers.
  store.setState({ followerIds: ['u-ana', 'u-gone'], people: [{ id: 'u-ana', name: 'Ana Nguyen', handle: '@ana', parish: '', followerCount: 3 }] });
  assert.deepEqual(followersOf(s()).map((p) => p.id), ['u-ana'], 'only members that can be shown');
  const ana = personFor(s(), 'u-ana');
  assert.ok(ana);
  assert.equal(followerCount(s(), ana), 3);
  s().toggleFollow('u-ana');
  assert.equal(followerCount(s(), ana), 4);
  assert.equal(personFor(s(), 'u-me')?.followerCount, 2);
  assert.equal(postsBy(s(), 'u-me').length, 1);

  // Milestones follow what the member has done.
  const before = milestonesFor(s()).find((m) => m.id === 'm-first');
  assert.deepEqual(before?.progress, { current: 0, total: 1 });
  s().togglePrayer('p-offering');
  assert.equal(milestonesFor(s()).find((m) => m.id === 'm-first')?.achieved, 'Done');
});

test('people are stable between reads', () => {
  const store = createAppStore(memoryStorage(), 'stable-people');
  store.getState().startSession(DEMO_USER, new Date(2026, 8, 27, 9, 0));
  const author = store.getState().posts[0]?.authorId ?? '';
  store.setState({ people: [], followerIds: [author] });
  assert.equal(personFor(store.getState(), author), personFor(store.getState(), author));
  assert.equal(followersOf(store.getState())[0], followersOf(store.getState())[0]);
});
