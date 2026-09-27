/**
 * Fills the database with what the app expects to find.
 *
 *   pnpm db:seed             reference data, plus the sample community
 *   pnpm db:seed --no-demo   reference data only: groups, events, intentions
 *   pnpm db:seed --clear-demo  removes the sample community again
 *
 * Safe to run more than once. Sample members have no password and cannot sign in.
 */
import { buildSeed, EVENTS, GROUPS, INTENTIONS, PEOPLE } from '@catalysis/api';
import { config } from 'dotenv';

config({ path: new URL('../../../apps/web/.env', import.meta.url).pathname, quiet: true });
config({ path: new URL('../../../apps/web/.env.local', import.meta.url).pathname, override: true, quiet: true });

const { db } = await import('./index.ts');
const client = db();
const args = process.argv.slice(2);

/**
 * TikTok accounts of well-known Catholic ministries, whose videos go into Reels
 * without waiting for a moderator. Moderators change the list in Reels → Review.
 */
const TRUSTED_CREATORS = [
  { handle: 'ascensionpress', name: 'Ascension Press' },
  { handle: 'catholicanswers', name: 'Catholic Answers' },
  { handle: 'hallowapp', name: 'Hallow' },
];

/** Sample members are recognised by this address, which can never receive mail. */
const sampleEmail = (id: string) => `${id}@sample.catalysis.invalid`;

async function reference() {
  for (const g of GROUPS) {
    const data = { name: g.name, shortName: g.shortName, description: g.description ?? null };
    await client.group.upsert({ where: { id: g.id }, update: data, create: { id: g.id, ...data } });
  }
  for (const [position, i] of INTENTIONS.entries()) {
    const data = { title: i.title, basePraying: i.prayingCount, position };
    await client.intention.upsert({ where: { id: i.id }, update: data, create: { id: i.id, ...data } });
  }
  // Events are replaced wholesale, so a calendar change in code reaches the database.
  const ids = EVENTS.map((e) => e.id);
  await client.event.deleteMany({ where: { id: { notIn: ids } } });
  for (const e of EVENTS) {
    const data = {
      title: e.title, shortTitle: e.shortTitle ?? null, date: e.date, time: e.time, location: e.location,
      groupId: e.groupId ?? null, baseGoing: e.goingCount, note: e.note ?? null, tone: e.tone ?? null,
    };
    await client.event.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data } });
  }
  // A starting list only: once moderators have made the list their own, it is left alone.
  if ((await client.tikTokCreator.count()) === 0) {
    await client.tikTokCreator.createMany({ data: TRUSTED_CREATORS, skipDuplicates: true });
  }
  console.log(`reference: ${GROUPS.length} groups, ${INTENTIONS.length} intentions, ${EVENTS.length} events`);
}

async function demo() {
  const seed = buildSeed(new Date());
  const authors = new Map<string, string>();
  for (const p of PEOPLE) authors.set(p.id, p.name);
  for (const post of seed.posts) authors.set(post.authorId, post.authorName);
  for (const comment of seed.comments) authors.set(comment.authorId, comment.authorName);

  for (const [id, name] of authors) {
    const person = PEOPLE.find((p) => p.id === id);
    const handle = person?.handle ?? `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
    const data = { name, parish: person?.parish ?? '' };
    await client.user.upsert({ where: { id }, update: data, create: { id, email: sampleEmail(id), handle, ...data } });
  }
  for (const post of seed.posts) {
    const data = {
      type: post.type, authorId: post.authorId, groupId: post.groupId ?? null, body: post.body ?? null, pullQuote: post.pullQuote ?? null,
      mediaKind: post.media?.kind ?? null, mediaAsset: post.media?.asset ?? null, mediaFocus: post.media?.focus ?? null,
      audience: post.audience, createdAt: new Date(post.createdAt), basePrayed: post.prayedCount,
      // The seeded count includes the sample replies that are stored as rows.
      baseReply: Math.max(0, post.replyCount - seed.comments.filter((c) => c.postId === post.id).length),
    };
    await client.post.upsert({ where: { id: post.id }, update: data, create: { id: post.id, ...data } });
  }
  for (const c of seed.comments) {
    const data = { postId: c.postId, authorId: c.authorId, body: c.body, createdAt: new Date(c.createdAt) };
    await client.comment.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } });
  }
  console.log(`sample community: ${authors.size} members, ${seed.posts.length} posts, ${seed.comments.length} replies`);
}

async function clearDemo() {
  const removed = await client.user.deleteMany({ where: { email: { endsWith: '@sample.catalysis.invalid' } } });
  console.log(`removed ${removed.count} sample members and everything they posted`);
}

try {
  if (args.includes('--clear-demo')) await clearDemo();
  else {
    await reference();
    if (!args.includes('--no-demo')) await demo();
  }
} finally {
  await client.$disconnect();
}
