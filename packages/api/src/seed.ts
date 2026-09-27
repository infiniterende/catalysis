/**
 * Demo content from the design handoff. Dates are laid out relative to the day
 * the app is first opened, so the demo account always shows a 12-day streak,
 * a 3 / 4 day and posts from "2 hours ago".
 */
import { addDays, parseISODate, toISODate } from './format.ts';
import { DEMO_ANSWERS } from './lumen/demo.ts';
import type {
  CalendarEvent, Comment, Conversation, DiscoverTile, Group, Highlight,
  Intention, JournalEntry, Media, Message, Person, Post, Prayer, PrayerLog, Reel, User,
} from './types.ts';

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
  headline: ['Rosary', 'together'],
  summary: 'Glorious Mysteries, live with 214 people from your parish.',
  media: { kind: 'image', asset: 'monstrance', focus: '50% 42%' } satisfies Media,
  tag: 'Tonight',
  title: 'The Glorious Mysteries',
  deck: 'Pray the Rosary with 214 others from your parish.',
  action: 'Begin · 20 min · Audio',
} as const;

export const GROUPS: Group[] = [
  { id: 'g-newman', name: 'Newman Center, NYU', shortName: 'Newman Center' },
  { id: 'g-wbs', name: 'Women’s Bible Study', shortName: 'Women’s Bible Study' },
  { id: 'g-ya', name: 'Young Adults, St. Joseph’s', shortName: 'Young Adults', description: 'Weekly Holy Hour and dinner, Thursdays at 7.' },
];

/** Members who follow the demo account. */
export const SEED_FOLLOWERS = ['u-ana', 'u-jacob', 'u-xavier'];

export const MY_GROUP_IDS = ['g-newman', 'g-wbs'];
export const SPOTLIGHT_GROUP_ID = 'g-ya';

export const INTENTIONS: Intention[] = [
  { id: 'i-1', title: 'For a grandmother entering hospice', prayingCount: 112 },
  { id: 'i-2', title: 'Discernment for three RCIA candidates', prayingCount: 87 },
  { id: 'i-3', title: 'Peace for students during midterms', prayingCount: 64 },
];

export const PEOPLE: Person[] = [
  { id: 'u-xavier', name: 'Fr. Xavier', handle: '@frxavier', parish: 'Newman Center, NYU' },
  { id: 'u-ana', name: 'Ana Nguyen', handle: '@ana', parish: 'St. Joseph’s' },
  { id: 'u-jacob', name: 'Jacob Torres', handle: '@jacob', parish: 'Newman Center, NYU' },
  { id: 'u-newman', name: 'Newman NYU', handle: '@newmannyu', parish: 'Newman Center, NYU' },
];

/** Pizza and Pews meets every Sunday evening. */
export const PIZZA_AND_PEWS = {
  title: 'Pizza and Pews',
  time: '20:00',
  location: 'Newman Center',
  groupId: 'g-newman',
  goingCount: 31,
  tone: 'a4',
} as const;

/** One event for each Sunday from `from` to `to`, both inclusive. Ids are stable: `e-pizza-2026-09-27`. */
export function weeklyPizzaAndPews(from: string, to: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const first = parseISODate(from);
  for (let day = addDays(first, (7 - first.getDay()) % 7); toISODate(day) <= to; day = addDays(day, 7)) {
    const date = toISODate(day);
    events.push({ id: `e-pizza-${date}`, date, ...PIZZA_AND_PEWS });
  }
  return events;
}

const ONE_OFF_EVENTS: CalendarEvent[] = [
  { id: 'e-welcome', title: 'Welcome Mass', date: '2026-09-03', time: '18:00', location: 'Newman Center', groupId: 'g-newman', goingCount: 86, tone: 'a3' },
  { id: 'e-bs-1', title: 'Bible Study', date: '2026-09-10', time: '19:30', location: 'Newman Center', groupId: 'g-wbs', goingCount: 14, tone: 'a4' },
  { id: 'e-bs-2', title: 'Bible Study', date: '2026-09-17', time: '19:30', location: 'Newman Center', groupId: 'g-wbs', goingCount: 12, tone: 'a4' },
  { id: 'e-service', title: 'Service Day', date: '2026-09-19', time: '09:00', location: 'St. Joseph’s Soup Kitchen', groupId: 'g-newman', goingCount: 27, tone: 'a2' },
  { id: 'e-bs-3', title: 'Bible Study', date: '2026-09-24', time: '19:30', location: 'Newman Center', groupId: 'g-wbs', goingCount: 15, tone: 'a4' },
  { id: 'e-adoration', title: 'Adoration & Confession', date: '2026-09-29', time: '19:00', location: 'Newman Center', groupId: 'g-newman', goingCount: 47, tone: 'a2' },
  { id: 'e-blessing', title: 'Blessing of the Animals', date: '2026-10-04', time: '14:00', location: 'Washington Square Park', groupId: 'g-newman', goingCount: 22, note: 'St. Francis', tone: 'a3' },
  { id: 'e-rosary-walk', title: 'Rosary Walk in the Park', date: '2026-10-07', time: '17:30', location: 'Washington Square Park', groupId: 'g-newman', goingCount: 18, note: 'Our Lady', tone: 'a5' },
];

/** The academic year's calendar: the one-off events, and Pizza and Pews each Sunday. */
export const EVENTS: CalendarEvent[] = [...ONE_OFF_EVENTS, ...weeklyPizzaAndPews('2026-09-01', '2027-05-31')].sort((a, b) =>
  `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
);

export const SEED_RSVPS = ['e-welcome', 'e-service', 'e-adoration'];

export const REELS: Reel[] = [
  {
    id: 'r-came-back', authorId: 'u-xavier', authorName: 'Fr. Xavier', initial: 'X',
    title: 'Why I came back to the Church.', subtitle: 'A sixty-second testimony.',
    category: 'Testimony', audio: 'Original audio',
    media: { kind: 'image', asset: 'stJoseph', focus: '50% 20%' },
    likeCount: 2400, commentCount: 188, feed: 'forYou',
  },
  {
    id: 'r-doubted', authorId: 'u-ana', authorName: 'Ana Nguyen', initial: 'A',
    title: 'Three saints who doubted.', subtitle: 'And what they did next.',
    category: 'Saints', audio: 'Original audio',
    media: { kind: 'image', asset: 'angel', focus: '50% 40%' },
    likeCount: 5100, commentCount: 342, feed: 'forYou',
  },
  {
    id: 'r-lectio', authorId: 'u-jacob', authorName: 'Jacob Torres', initial: 'J',
    title: 'Lectio in sixty seconds.', subtitle: 'Four steps, one passage.',
    category: 'Prayer', audio: 'Original audio',
    media: { kind: 'image', asset: 'rosary', focus: '25% 70%' },
    likeCount: 1200, commentCount: 96, feed: 'forYou',
  },
  {
    id: 'r-adoration', authorId: 'u-newman', authorName: 'Newman NYU', initial: 'N',
    title: 'Adoration, in time-lapse.', subtitle: 'One hour before the Blessed Sacrament.',
    category: 'Parish', audio: 'Tantum Ergo',
    media: { kind: 'image', asset: 'monstrance', focus: '50% 42%' },
    likeCount: 980, commentCount: 41, feed: 'following',
  },
];

export const SEED_FOLLOWING = ['u-newman'];

/** Left and right columns of the Discover masonry, as drawn. */
export const DISCOVER_COLUMNS: [DiscoverTile[], DiscoverTile[]] = [
  [
    { id: 'd-1', kind: 'reel', reelId: 'r-came-back', title: 'Why I came back', meta: 'Fr. Xavier · 2.4k', height: 250 },
    { id: 'd-2', kind: 'photo', media: { kind: 'image', asset: 'rosary', focus: '20% 75%' }, height: 170, iconTone: 'dark' },
    { id: 'd-3', kind: 'reel', reelId: 'r-adoration', title: 'Adoration, in time-lapse', meta: 'Newman NYU · 980', height: 200 },
  ],
  [
    { id: 'd-4', kind: 'photo', media: { kind: 'image', asset: 'stJoseph', focus: '50% 22%' }, height: 170 },
    { id: 'd-5', kind: 'reel', reelId: 'r-doubted', title: 'Three saints who doubted', meta: 'Ana Nguyen · 5.1k', media: { kind: 'image', asset: 'angel', focus: '50% 40%' }, height: 250 },
    { id: 'd-6', kind: 'reel', reelId: 'r-lectio', title: 'Lectio in sixty seconds', meta: 'Jacob Torres · 1.2k', height: 200 },
  ],
];

export interface SeedBundle {
  prayerLogs: PrayerLog[];
  prayerCountOffset: number;
  posts: Post[];
  comments: Comment[];
  prayedPostIds: string[];
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

  const posts: Post[] = [
    {
      id: 'post-jacob', type: 'request', authorId: 'u-jacob', authorName: 'Jacob Torres', groupId: 'g-newman',
      body: 'Starting finals week and feeling the weight of it. Could use prayers for peace and focus. Trusting that He’s got me.',
      audience: 'everyone', createdAt: hoursAgo(now, 2), prayedCount: 23, replyCount: 7,
    },
    {
      id: 'post-ana', type: 'photo', authorId: 'u-ana', authorName: 'Ana Nguyen',
      pullQuote: '“Go to Joseph.”',
      body: 'Found this window after Mass at St. Joseph’s. Asking his intercession for everyone waiting on a door to open this week.',
      media: { kind: 'image', asset: 'stJoseph', focus: '50% 25%' },
      audience: 'everyone', createdAt: hoursAgo(now, 5), prayedCount: 41, replyCount: 12,
    },
    {
      id: 'post-clare', type: 'photo', authorId: 'u-clare', authorName: 'Clare Whitfield', groupId: 'g-wbs',
      pullQuote: '“Do not let your hearts be troubled.”',
      media: { kind: 'image', asset: 'rosary', focus: '30% 70%' },
      audience: 'everyone', createdAt: hoursAgo(now, 9), prayedCount: 58, replyCount: 9,
    },
    {
      id: 'post-newman', type: 'reflection', authorId: 'u-newman', authorName: 'Newman NYU', groupId: 'g-newman',
      body: 'Adoration and Confession this Tuesday at seven, for the Feast of the Archangels. And Pizza and Pews is every Sunday at eight. Bring a friend.',
      audience: 'parish', createdAt: hoursAgo(now, 20), prayedCount: 17, replyCount: 3,
    },
  ];

  const comments: Comment[] = [
    { id: 'c-1', postId: 'post-jacob', authorId: 'u-ana', authorName: 'Ana Nguyen', body: 'Praying for you, Jacob. Offering my Rosary tonight.', createdAt: hoursAgo(now, 1.5) },
    { id: 'c-2', postId: 'post-jacob', authorId: 'u-xavier', authorName: 'Fr. Xavier', body: 'You are in my Mass intentions tomorrow. Come by the chapel if you need quiet.', createdAt: hoursAgo(now, 1) },
    { id: 'c-3', postId: 'post-ana', authorId: 'u-jacob', authorName: 'Jacob Torres', body: 'That window is beautiful. St. Joseph, pray for us.', createdAt: hoursAgo(now, 4) },
  ];

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
    posts,
    comments,
    prayedPostIds: ['post-jacob'],
    highlights,
    conversations,
  };
}
