/**
 * Fills the database with what the app expects to find.
 *
 *   pnpm db:seed               the starting list of trusted TikTok creators
 *   pnpm db:seed --clear-demo  removes the sample community an earlier version
 *                              wrote: its members and their posts, and the
 *                              sample groups, intentions and events
 *
 * Safe to run more than once. Members' own posts, groups and accounts are never touched.
 */
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

async function reference() {
  // A starting list only: once moderators have made the list their own, it is left alone.
  if ((await client.tikTokCreator.count()) === 0) {
    await client.tikTokCreator.createMany({ data: TRUSTED_CREATORS, skipDuplicates: true });
  }
  console.log(`trusted creators: ${await client.tikTokCreator.count()}`);
}

/** What the earlier sample community wrote. Members could not create any of these, only the seed. */
const SAMPLE = {
  groups: ['g-newman', 'g-wbs', 'g-ya'],
  intentions: ['i-1', 'i-2', 'i-3'],
};

async function clearDemo() {
  // Sample members were recognised by this address, which can never receive mail.
  const members = await client.user.deleteMany({ where: { email: { endsWith: '@sample.catalysis.invalid' } } });
  // Members' posts in a sample group stay; they lose the group.
  const groups = await client.group.deleteMany({ where: { id: { in: SAMPLE.groups }, ownerId: null } });
  const intentions = await client.intention.deleteMany({ where: { id: { in: SAMPLE.intentions } } });
  // There is no way to create an event yet, so every event came from the seed.
  const events = await client.event.deleteMany({});
  console.log(
    `removed ${members.count} sample members and everything they posted, ${groups.count} groups, ` +
      `${intentions.count} intentions and ${events.count} events`,
  );
}

try {
  if (args.includes('--clear-demo')) await clearDemo();
  else await reference();
} finally {
  await client.$disconnect();
}
