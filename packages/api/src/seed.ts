/**
 * The demo account and the prayers every account starts with. The demo's own
 * history is laid out relative to the day it is opened, so it always shows a
 * 12-day streak and a 3 / 4 day. There is no sample community: everything in
 * the feed, the calendar, groups and reels comes from real members.
 */
import { addDays, parseISODate, toISODate } from './format.ts';
import { DEMO_ANSWERS } from './lumen/demo.ts';
import type { Conversation, Highlight, JournalEntry, Media, Message, Prayer, PrayerLog, User } from './types.ts';

export const DEMO_EMAIL = 'maria.acosta@nyu.edu';

export const DEMO_USER: User = {
  id: 'u-maria',
  name: 'Maria Acosta',
  handle: '@maria',
  email: DEMO_EMAIL,
  parish: 'Newman Center, NYU',
  quote: {
    text: 'Pray as though everything depended on God. Work as though everything depended on you.',
    attribution: 'Attributed to St. Ignatius',
  },
  booksRead: 17,
  bestStreak: 31,
  prayerCountOffset: 0,
  milestones: [
    { id: 'm-100', title: 'One hundred days of prayer', achieved: 'Aug 26' },
    { id: 'm-gospels', title: 'The Four Gospels, read', achieved: 'Jun 26' },
    { id: 'm-lectio', title: 'Thirty days of Lectio Divina', progress: { current: 18, total: 30 } },
  ],
};

export function newUser(input: { name: string; email: string }): User {
  const first = input.name.trim().split(/\s+/)[0] ?? 'friend';
  return {
    id: `u-${Date.now().toString(36)}`,
    name: input.name.trim(),
    handle: `@${first.toLowerCase().replace(/[^a-z0-9]/g, '') || 'friend'}`,
    email: input.email.trim().toLowerCase(),
    parish: 'Add your parish',
    booksRead: 0,
    prayerCountOffset: 0,
    milestones: [
      { id: 'm-7', title: 'Seven days of prayer', progress: { current: 0, total: 7 } },
      { id: 'm-gospel', title: 'A Gospel, read', progress: { current: 0, total: 1 } },
    ],
  };
}

export const DEFAULT_PRAYERS: Prayer[] = [
  { id: 'p-offering', title: 'Morning Offering', scheduledTime: '07:00', guidedContentId: 'g-offering' },
  { id: 'p-angelus', title: 'The Angelus', scheduledTime: '12:00', guidedContentId: 'g-angelus' },
  { id: 'p-rosary', title: 'Rosary · Glorious Mysteries', shortTitle: 'Rosary · Glorious', scheduledTime: '17:30', guidedContentId: 'g-rosary' },
  { id: 'p-examen', title: 'Evening Examen', scheduledTime: '21:00', guidedContentId: 'g-examen' },
];

/** Shown in the Prayer screen's "Guided" list, in order. */
export const FEATURED_GUIDED_IDS = ['g-examen', 'g-lectio', 'g-chaplet'];

export const TONIGHT = {
  id: 'tonight-rosary',
  guidedId: 'g-rosary',
  /** `HH:mm`, 24-hour local time. */
  time: '20:00',
  minutes: 20,
  headline: ['The', 'Rosary'],
  summary: 'The Glorious Mysteries, about twenty minutes, with audio.',
  media: { kind: 'image', asset: 'monstrance', focus: '50% 42%' } satisfies Media,
  tag: 'Tonight',
  title: 'The Glorious Mysteries',
  deck: 'End the day with the Rosary, about twenty minutes.',
  action: 'Begin · 20 min · Audio',
} as const;

export interface SeedBundle {
  prayerLogs: PrayerLog[];
  prayerCountOffset: number;
  highlights: Highlight[];
  conversations: Conversation[];
  journal: JournalEntry[];
}

const at = (day: Date, time: string): string => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).toISOString();
};

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

function seedMessage(id: string, role: Message['role'], createdAt: string, content: string, answer?: typeof DEMO_ANSWERS.FORGIVENESS): Message {
  return { id, role, content, createdAt, citations: answer?.citations ?? [], followUps: answer?.followUps ?? [] };
}

/** Builds the demo account's history relative to `now`. */
export function buildSeed(now: Date): SeedBundle {
  const today = parseISODate(toISODate(now));
  const todayISO = toISODate(today);

  const prayerLogs: PrayerLog[] = [];
  const logDay = (back: number, prayers: typeof DEFAULT_PRAYERS) => {
    const day = addDays(today, -back);
    for (const prayer of prayers) {
      prayerLogs.push({ prayerId: prayer.id, date: toISODate(day), completedAt: at(day, prayer.scheduledTime) });
    }
  };
  // An earlier, patchier stretch, so the month's record looks lived-in. Day 12 is
  // missed, which is what makes the present streak twelve days long.
  const EARLIER = [2, 4, 3, 1, 2, 4, 4, 3, 1, 1, 2, 3, 1, 2, 4, 3, 0, 2];
  EARLIER.forEach((count, i) => logDay(13 + i, DEFAULT_PRAYERS.slice(0, count)));
  // Eleven days before today, then three of four prayers today: a 12-day streak.
  for (let back = 11; back >= 1; back--) {
    // Leave the odd Examen unprayed.
    logDay(back, DEFAULT_PRAYERS.filter((prayer) => !(prayer.id === 'p-examen' && back % 4 === 0)));
  }
  prayerLogs.push(
    { prayerId: 'p-offering', date: todayISO, completedAt: at(today, '07:14') },
    { prayerId: 'p-angelus', date: todayISO, completedAt: at(today, '12:02') },
    { prayerId: 'p-rosary', date: todayISO, completedAt: at(today, '17:30') },
  );

  const highlights: Highlight[] = [
    { id: 'h-seed', bookId: 'JHN', chapter: 1, verseStart: 4, verseEnd: 4, text: 'this life was the light of the human race', createdAt: hoursAgo(now, 30) },
  ];

  const conversation = (id: string, title: string, question: string, answer: typeof DEMO_ANSWERS.FORGIVENESS, hours: number): Conversation => ({
    id,
    title,
    updatedAt: hoursAgo(now, hours),
    messages: [
      seedMessage(`${id}-q`, 'user', hoursAgo(now, hours), question),
      seedMessage(`${id}-a`, 'assistant', hoursAgo(now, hours), answer.content, answer),
    ],
  });

  const conversations: Conversation[] = [
    conversation('conv-forgiveness', 'Forgiveness when it’s hard', 'What does the Church teach about forgiveness when it’s really hard?', DEMO_ANSWERS.FORGIVENESS, 0.1),
    conversation('conv-archangels', 'Who were the three archangels?', 'Who were the three archangels?', DEMO_ANSWERS.ARCHANGELS, 26),
    conversation('conv-examen', 'How to pray the Examen', 'How do I pray the Examen?', DEMO_ANSWERS.EXAMEN, 50),
    conversation('conv-purgatory', 'Purgatory in the Catechism', 'What does the Catechism say about Purgatory?', DEMO_ANSWERS.PURGATORY, 98),
  ];

  const entry = (back: number, time: string, rest: Pick<JournalEntry, 'kind' | 'body'> & Partial<JournalEntry>): JournalEntry => {
    const day = addDays(today, -back);
    const stamp = at(day, time);
    return { id: `j-seed-${back}`, date: toISODate(day), createdAt: stamp, updatedAt: stamp, ...rest };
  };
  const journal: JournalEntry[] = [
    entry(0, '07:20', {
      kind: 'gratitude', title: 'Small mercies',
      body: 'Coffee with Ana before class. The light on Washington Square this morning. A seat on the train. Thank you, Lord.',
    }),
    entry(1, '21:15', {
      kind: 'examen', prayerId: 'g-examen', title: 'Evening Examen',
      body: 'I noticed God in the quiet of the chapel at noon. I was short with my roommate over the dishes and need to say sorry. Tomorrow I ask for patience.',
    }),
    entry(3, '18:40', {
      kind: 'petition', title: 'For Dad’s surgery',
      body: 'Lord, guide the surgeon’s hands on Thursday and give Mom peace while she waits.',
    }),
    entry(6, '09:05', {
      kind: 'lectio', prayerId: 'g-lectio', scripture: 'John 15:5', title: 'Remain in me',
      body: '“Without me you can do nothing.” I keep trying to carry this semester alone. The word that stayed with me was remain.',
    }),
    { ...entry(12, '20:30', { kind: 'petition', title: 'Housing for next year', body: 'Please let the lease come through before the deadline.' }), answeredOn: toISODate(addDays(today, -8)) },
  ];

  return {
    journal,
    prayerLogs,
    // The profile's all-time count reads 342 on the day the demo is seeded.
    prayerCountOffset: 342 - prayerLogs.length,
    highlights,
    conversations,
  };
}
