import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adjacentChapter, BIBLE_BOOKS, buildMonthGrid, buildRule, buildSeed, buildWeek, chapterTitle, compactCount,
  computeStreak, createAppStore, createProseFilter, DEMO_USER, easterSunday, formatDayShort, formatHour,
  formatTime12, getLiturgicalDay, localAuth, META_MARKER, nextEvent, allEvents, discoverColumns, parseLumenBlocks, prayedCount,
  allTimePrayers, roman, segmentVerse, splitReply, toISODate, DEFAULT_PRAYERS, defaultEditionShort, fetchChapter,
  setBibleSource, verseRuns, parseISODate, buildMonth, longestStreak, bestStreak, verseRanges, versesLabel,
  chapterOf, compactChanges, feedReels, findPrayer, GUIDED_PRAYERS, journalFor, rosaryFor,
  searchPrayerBook, TONIGHT, type Change, cccForDay, cccLabel, cccPageFor, cccSpan, currentHour, isHourId, parseCccNumber, parseCccReference, sourceMissesCelebration, readingRef, parsePassage, passageChapters, passageVerses, usccbReadingsUrl, EDITIONS, cleanVerseText, checkRecitation, dueMemory, firstLetters, hiddenWords, learningMemory, memoryStatus, memoryTokens, newMemoryVerse, nextMemoryReview, reviewMemory, suggestedGrade, SUGGESTED_PASSAGES, followerCount, followersOf, groupFor, groupsToJoin, memberCount, milestonesFor, myGroups, personFor, postsBy,
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

  // No sample events: the calendar lists only real ones.
  assert.deepEqual(allEvents(), []);
  const events = [
    { id: 'e-b', title: 'B', date: '2026-09-29', time: '19:00', location: '', goingCount: 0 },
    { id: 'e-a', title: 'A', date: '2026-09-27', time: '20:00', location: '', goingCount: 0 },
  ];
  assert.equal(nextEvent(events, '2026-09-26')?.id, 'e-a');
  assert.equal(nextEvent(events, '2026-09-28')?.id, 'e-b');
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

  // The demo keeps its own history but brings no sample community with it.
  assert.deepEqual(
    [s().posts.length, s().comments.length, s().followerIds.length, s().followingIds.length, s().joinedGroupIds.length, s().groups.length, s().people.length],
    [0, 0, 0, 0, 0, 0, 0],
  );

  s().togglePrayer('p-examen', now);
  assert.equal(buildRule(s().prayers, s().prayerLogs, '2026-09-26').filter((r) => r.done).length, 4);
  assert.equal(allTimePrayers(s()), 343);
  s().togglePrayer('p-examen', now);
  assert.equal(allTimePrayers(s()), 342);

  s().toggleRsvp('e-somewhere');
  assert.ok(s().rsvpEventIds.includes('e-somewhere'));

  const post = s().addPost({ type: 'reflection', body: '  Peace be with you.  ', audience: 'everyone' }, now);
  assert.equal(post?.body, 'Peace be with you.');
  assert.equal(s().posts[0]?.id, post?.id);
  assert.equal(prayedCount(s(), post!), 0);
  s().togglePrayed(post!.id);
  assert.equal(prayedCount(s(), post!), 1);
  s().reportPost('post-other');
  assert.ok(s().hiddenPostIds.includes('post-other') && !s().hiddenPostIds.includes(post!.id));

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

test('discover columns', () => {
  assert.deepEqual(discoverColumns([], []), [[], []]);
  const reel = (id: string) => ({ id, authorId: 'u-a', authorName: 'A', initial: 'A', title: id, subtitle: '', category: '', audio: '', likeCount: 0, commentCount: 0, feed: 'forYou' as const });
  const photo = { id: 'p-1', type: 'photo' as const, authorId: 'u-a', authorName: 'A', media: { kind: 'image' as const, asset: 'rosary' as const }, audience: 'everyone' as const, createdAt: '', prayedCount: 0, replyCount: 0 };
  const text = { ...photo, id: 'p-2', type: 'reflection' as const, media: undefined };
  const [left, right] = discoverColumns([reel('r-1'), reel('r-2'), reel('r-3')], [photo, text]);
  assert.deepEqual(left.map((t) => t.id), ['d-r-1', 'd-r-3']);
  assert.deepEqual(right.map((t) => [t.id, t.kind]), [['d-r-2', 'reel'], ['d-p-1', 'photo']]);
  assert.deepEqual(left.map((t) => t.height), [250, 170]);
});

test('groups and followers', () => {
  const changes: Change[] = [];
  const store = createAppStore(memoryStorage(), 'groups-test', { onChange: (c) => changes.push(c) });
  const s = () => store.getState();
  s().startSession({ ...DEMO_USER, id: 'u-me', name: 'Me', handle: '@me' });
  // Someone else's group.
  store.setState({ groups: [{ id: 'g-other', name: 'Young Adults, St. Anne’s', shortName: 'Young Adults', ownerId: 'u-other' }] });

  assert.ok(!s().createGroup({ name: 'ab' }).ok, 'too short');
  assert.ok(!s().createGroup({ name: 'Young Adults, St. Anne’s' }).ok, 'name already taken');
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
  s().deleteGroup('g-other');
  assert.ok(groupFor(s(), 'g-other'));
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

test('catechism references', () => {
  assert.deepEqual(parseCccReference('CCC 2838–2845'), { start: 2838, end: 2845 });
  assert.deepEqual(parseCccReference('CCC 2838-45'), { start: 2838, end: 2845 });
  assert.deepEqual(parseCccReference('CCC 1324, 1327'), { start: 1324, end: 1324 });
  assert.deepEqual(parseCccReference('Catechism 27'), { start: 27, end: 27 });
  assert.equal(parseCccReference('CCC 3000'), undefined);
  assert.equal(parseCccReference('John 3:16'), undefined);
  assert.equal(parseCccNumber('§2267'), 2267);
  assert.equal(parseCccNumber('ccc 1'), 1);
  assert.equal(parseCccNumber('2867'), undefined);
  assert.equal(cccLabel({ start: 5, end: 5 }), 'CCC 5');

  const toc = [
    { depth: 1, page: 'p1', first: 1, last: 25 },
    { depth: 2, page: 'p2', first: 1, last: 3 },
    { depth: 2, page: 'p3', first: 4, last: 10 },
    { depth: 3, first: 26, last: 30 },
  ];
  assert.equal(cccPageFor(toc, 2)?.page, 'p2', 'the deepest page holding it');
  assert.equal(cccPageFor(toc, 20)?.page, 'p1');
  assert.equal(cccPageFor(toc, 27), undefined, 'a heading without a page is not a page');

  // A year's portions cover every paragraph once, in order.
  for (const year of [2026, 2028]) {
    const days = year === 2028 ? 366 : 365;
    let next = 1;
    for (let i = 0; i < days; i++) {
      const { start, end } = cccForDay(toISODate(new Date(year, 0, 1 + i)));
      assert.equal(start, next, `${year} day ${i + 1} starts where the day before ended`);
      assert.ok(end - start <= 8);
      next = end + 1;
    }
    assert.equal(next, 2866, `${year} ends at §2865`);
  }
  assert.deepEqual(cccSpan({ first: 1066, last: 1075, end: 1690 }), { start: 1066, end: 1690 });
});

test('liturgy of the hours', () => {
  assert.equal(currentHour(new Date(2026, 9, 27, 3, 0)), 'compline');
  assert.equal(currentHour(new Date(2026, 9, 27, 6, 30)), 'lauds');
  assert.equal(currentHour(new Date(2026, 9, 27, 12, 0)), 'daytime');
  assert.equal(currentHour(new Date(2026, 9, 27, 18, 0)), 'vespers');
  assert.equal(currentHour(new Date(2026, 9, 27, 22, 0)), 'compline');
  assert.ok(isHourId('lauds') && !isHourId('matins'));

  // The app's calendar knows All Saints; a source that gives the Sunday instead is flagged.
  const allSaints = getLiturgicalDay('2026-11-01');
  assert.equal(sourceMissesCelebration(allSaints, 'Thirty-First Sunday in Ordinary Time'), true);
  assert.equal(sourceMissesCelebration(allSaints, 'All Saints'), false);
  assert.equal(sourceMissesCelebration(getLiturgicalDay('2026-12-25'), 'The Nativity of the Lord'), false);
  assert.equal(sourceMissesCelebration(getLiturgicalDay('2026-12-08'), 'Tuesday of the Second Week of Advent'), true);
  // An ordinary weekday is never flagged.
  assert.equal(sourceMissesCelebration(getLiturgicalDay('2026-10-27'), 'anything at all'), false);
});

test('mass reading citations', () => {
  const spans = (c: string) => parsePassage(c)?.spans.map(({ from, to }) => `${from.c}:${from.v}-${to.c}:${to.v}`).join(' ');
  assert.equal(parsePassage('Matthew 5:1-12a')?.bookId, 'MAT');
  assert.equal(spans('Matthew 5:1-12a'), '5:1-5:12');
  assert.equal(spans('Psalm 22:26b-27, 28-30ab, 30e, 31-32'), '22:26-22:27 22:28-22:30 22:30-22:30 22:31-22:32');
  assert.equal(spans('Habakkuk 1:2-3; 2:2-4'), '1:2-1:3 2:2-2:4');
  assert.equal(spans('Jonah 1:1–2:1-2, 11'), '1:1-2:2 2:11-2:11', 'a run into the next chapter, then a verse there');
  assert.equal(spans('Wisdom 2:23—3:9'), '2:23-3:9');
  assert.equal(spans('Psalm 149:1b-2, 3-4, 5-6a and 9b'), '149:1-149:2 149:3-149:4 149:5-149:6 149:9-149:9');
  assert.equal(spans('Matthew 4:12-23 or 4:12-17'), '4:12-4:23', 'the longer form');
  assert.equal(spans('John 20:1a and 2-8'), '20:1-20:1 20:2-20:8');
  assert.equal(parsePassage('Phiippians 2:5-11')?.bookId, 'PHP', 'a misspelling in the data');
  assert.equal(spans('Philemon 9-10, 12-17'), '1:9-1:10 1:12-1:17', 'a book of one chapter, cited by verse');
  assert.equal(parsePassage('Romans 9-10'), undefined, 'a book of many chapters needs a chapter');
  // Typing slips in the data.
  assert.equal(spans('Psalm 23: 1-3a, 3b4, 5, 6'), '23:1-23:3 23:3-23:4 23:5-23:5 23:6-23:6');
  assert.equal(spans('Psalm 85:9-10-11-12, 13-14'), '85:9-85:12 85:13-85:14');
  assert.equal(spans('Psalm 78:3 & 4bc, 6c-7, 8'), '78:3-78:3 78:4-78:4 78:6-78:7 78:8-78:8');
  assert.equal(spans('Sirach 51:12 cd-20'), '51:12-51:20');
  assert.equal(spans('Psalm 136:1 and 23-24, 10-12'), '136:1-136:1 136:23-136:24 136:10-136:12', '"and" after a verse is still a separator');
  assert.equal(spans('Psalm 72:1-2, 7-8, 10-11, 12-13.'), '72:1-72:2 72:7-72:8 72:10-72:11 72:12-72:13');
  assert.equal(spans('Revelation 11:19A; 12:1-6A, 10AB'), '11:19-11:19 12:1-12:6 12:10-12:10');
  assert.equal(spans('Malachi 4:1-2a'), '3:19-3:20', 'Malachi 4 is Malachi 3:19-24 in the NAB');
  assert.equal(parsePassage('Esther C:12, 14-16, 23-25'), undefined, 'lettered chapters are not in the Bible');
  assert.equal(parsePassage('John 99:1'), undefined);
  assert.equal(parsePassage('Hezekiah 3:1'), undefined);
  assert.deepEqual(readingRef('1 John 3:1-3'), { bookId: '1JN', chapter: 3, verse: 1 });
  assert.equal(usccbReadingsUrl('2026-11-03'), 'https://bible.usccb.org/bible/readings/110326.cfm');

  // The text as read at Mass: no psalm titles or "Selah"; other verses come back unchanged.
  assert.equal(cleanVerseText('REV', 9, 'After this I had a vision of a great multitude.'), 'After this I had a vision of a great multitude.');
  assert.equal(cleanVerseText('MAT', 12, 'Thus they persecuted the prophets who were before you.'), 'Thus they persecuted the prophets who were before you.');
  assert.equal(cleanVerseText('PSA', 1, 'A psalm of David. The earth is the LORD’s and all it holds.'), 'The earth is the LORD’s and all it holds.');
  assert.equal(cleanVerseText('PSA', 6, 'that seeks the face of the God of Jacob.” Selah'), 'that seeks the face of the God of Jacob.”');
  assert.equal(cleanVerseText('PSA', 1, 'For the leader; according to the gittith. Of David.'), '', 'a verse that is only a title');
  assert.equal(cleanVerseText('GAL', 18, 'The grace of our Lord Jesus Christ be with your spirit, brothers. Amen.'), 'The grace of our Lord Jesus Christ be with your spirit, brothers. Amen.', '"Amen" is scripture');
  assert.equal(cleanVerseText('1CH', 31, 'Beth-marcaboth, Hazar-susim, Bethbiri, and Shaaraim. These were their cities.'), 'Beth-marcaboth, Hazar-susim, Bethbiri, and Shaaraim. These were their cities.', 'a list of names is not a title');
  assert.equal(cleanVerseText('JHN', 1, 'In the beginning was the Word, and the Word was with God.'), 'In the beginning was the Word, and the Word was with God.');

  // Verses come once each, in order, across chapters.
  const passage = parsePassage('Jonah 1:16–2:2, 1');
  assert.ok(passage);
  assert.deepEqual(passageChapters(passage), [1, 2]);
  const chapter = (c: number, n: number) => ({ ref: { bookId: 'JON', chapter: c }, edition: EDITIONS.nabre, verses: Array.from({ length: n }, (_, i) => ({ number: i + 1, text: `${c}.${i + 1}` })) });
  const verses = passageVerses(passage, new Map([[1, chapter(1, 16)], [2, chapter(2, 11)]]));
  assert.deepEqual(verses.map((v) => v.text), ['1.16', '2.1', '2.2']);
});

test('scripture memory', () => {
  const day = (iso: string, hour = 9) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), hour);
  const text = 'For God so loved the world that he gave his only Son.';
  let v = newMemoryVerse({ id: 'mv-1', bookId: 'JHN', chapter: 3, verseStart: 16, verseEnd: 16, text: `  ${text}  ` }, day('2026-11-03'));
  assert.equal(v.text, text);
  assert.deepEqual([v.box, v.dueOn, memoryStatus(v, '2026-11-03')], [0, '2026-11-03', 'Learning']);

  // Learning: a slip keeps it in learning, due today; learning it sends it to box 1, due tomorrow.
  assert.deepEqual([reviewMemory(v, 'again', day('2026-11-03')).box, reviewMemory(v, 'again', day('2026-11-03')).dueOn], [0, '2026-11-03']);
  v = reviewMemory(v, 'good', day('2026-11-03'));
  assert.deepEqual([v.box, v.dueOn, v.reviews, v.lastReviewedOn], [1, '2026-11-04', 1, '2026-11-03']);
  assert.equal(memoryStatus(v, '2026-11-03'), 'Next tomorrow');
  // The boxes widen: 3 days, then a week; "easy" skips a box; "hard" waits half as long.
  v = reviewMemory(v, 'good', day('2026-11-04'));
  assert.deepEqual([v.box, v.dueOn], [2, '2026-11-07']);
  v = reviewMemory(v, 'easy', day('2026-11-07'));
  assert.deepEqual([v.box, v.dueOn], [4, '2026-11-21']);
  assert.deepEqual([reviewMemory(v, 'hard', day('2026-11-21')).box, reviewMemory(v, 'hard', day('2026-11-21')).dueOn], [4, '2026-11-28']);
  // A slip after learning goes back to box 1, and is counted.
  const slipped = reviewMemory(v, 'again', day('2026-11-21'));
  assert.deepEqual([slipped.box, slipped.dueOn, slipped.lapses], [1, '2026-11-22', 1]);
  // Across a change of clocks the schedule still counts whole days.
  assert.equal(reviewMemory({ ...v, box: 2 }, 'good', day('2026-10-31', 23)).dueOn, '2026-11-07');

  const learning = newMemoryVerse({ id: 'mv-2', bookId: 'PSA', chapter: 23, verseStart: 1, verseEnd: 1, text: 'The LORD is my shepherd.' }, day('2026-11-01'));
  const list = [v, learning, { ...slipped, id: 'mv-3' }];
  assert.deepEqual(dueMemory(list, '2026-11-22').map((x) => x.id), ['mv-1', 'mv-3'], 'the longest waiting first');
  assert.deepEqual(dueMemory(list, '2026-11-21').map((x) => x.id), ['mv-1']);
  assert.deepEqual(dueMemory([v], '2026-11-20'), []);
  assert.equal(nextMemoryReview([v], '2026-11-20'), '2026-11-21');
  assert.deepEqual(learningMemory(list).map((x) => x.id), ['mv-2']);

  // Words: punctuation stays with the word, and short words are spared light rounds.
  const quoted = '“Come to me, all you who labor — and I will give you rest.”';
  const tokens = memoryTokens(quoted);
  assert.deepEqual(tokens[0], { lead: '“', word: 'Come', tail: '' });
  assert.deepEqual(tokens[2], { lead: '', word: 'me', tail: ',' });
  assert.deepEqual(tokens[7], { lead: '—', word: '', tail: '' });
  assert.deepEqual(tokens.at(-1), { lead: '', word: 'rest', tail: '.”' });
  assert.equal(firstLetters('In the beginning was the Word,'), 'I t b w t W,');
  const light = hiddenWords(quoted, 0.3);
  assert.ok(light.size >= 2 && [...light].every((i) => (tokens[i]?.word.length ?? 0) > 2));
  assert.deepEqual([...hiddenWords(quoted, 0.3)], [...light], 'the same round hides the same words');
  assert.ok(hiddenWords(quoted, 1).size === tokens.filter((t) => t.word).length);

  // Recitation: case, punctuation and accents don't matter; a missed word costs only itself.
  const perfect = checkRecitation(quoted, 'come to me all you who labor and i will give you rest');
  assert.equal(perfect.score, 1);
  const missed = checkRecitation(quoted, 'Come to me, all who labor and I will give you rest');
  assert.equal(missed.words.filter((w) => w.word && !w.ok).map((w) => w.word).join(), 'you');
  assert.equal(Math.round(missed.score * 12), 11);
  assert.equal(checkRecitation(quoted, 'Come unto me, all you who labor and I will give you rest').extra, 1);
  assert.equal(checkRecitation(quoted, '').score, 0);
  assert.deepEqual([suggestedGrade(1), suggestedGrade(0.9), suggestedGrade(0.5)], ['good', 'hard', 'again']);
  assert.ok(SUGGESTED_PASSAGES.length >= 10);
});

test('scripture memory in the store', () => {
  const changes: Change[] = [];
  const store = createAppStore(memoryStorage(), 'memory-test', { onChange: (c) => changes.push(c) });
  const s = () => store.getState();
  s().startSession({ ...DEMO_USER, id: 'u-me' });
  const now = new Date(2026, 10, 3, 9);
  const input = { bookId: 'JHN', chapter: 3, verseStart: 16, verseEnd: 16, text: 'For God so loved the world.' };
  const added = s().addMemoryVerse(input, now);
  assert.ok(added);
  assert.equal(s().addMemoryVerse(input, now)?.id, added.id, 'a passage is saved once');
  assert.equal(s().memory.length, 1);
  assert.equal(s().addMemoryVerse({ ...input, verseEnd: 40 }, now), undefined, 'too long');
  s().reviewMemoryVerse(added.id, 'good', now);
  assert.equal(s().memory[0]?.box, 1);
  s().restartMemoryVerse(added.id, now);
  assert.deepEqual([s().memory[0]?.box, s().memory[0]?.dueOn], [0, '2026-11-03']);
  s().removeMemoryVerse(added.id);
  assert.equal(s().memory.length, 0);
  assert.deepEqual(changes.map((c) => c.type), ['memory.save', 'memory.save', 'memory.save', 'memory.delete']);
  // Repeated saves of one passage in a batch collapse to the last.
  const saves = changes.filter((c) => c.type === 'memory.save');
  assert.equal(compactChanges(saves).length, 1);
});
