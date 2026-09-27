/**
 * Makes a member a moderator, or takes the role away.
 *
 *   pnpm db:moderator you@example.com
 *   pnpm db:moderator you@example.com --remove
 *   pnpm db:moderator                     (lists the moderators)
 *
 * Moderators decide which TikTok videos appear in Reels.
 */
import { config } from 'dotenv';

config({ path: new URL('../../../apps/web/.env', import.meta.url).pathname, quiet: true });
config({ path: new URL('../../../apps/web/.env.local', import.meta.url).pathname, override: true, quiet: true });

const { db, isDatabaseConfigured } = await import('./index.ts');

if (!isDatabaseConfigured()) {
  console.error('DATABASE_URL is not set. Add it to apps/web/.env first.');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase();
const remove = args.includes('--remove');

if (!email) {
  const moderators = await db().user.findMany({ where: { role: 'moderator' }, select: { name: true, email: true }, orderBy: { name: 'asc' } });
  console.log(moderators.length ? moderators.map((m) => `${m.name} <${m.email}>`).join('\n') : 'No moderators yet. Run: pnpm db:moderator you@example.com');
  process.exit(0);
}

const user = await db().user.findUnique({ where: { email }, select: { id: true, name: true, passwordHash: true } });
if (!user) {
  console.error(`No account uses ${email}. Sign up in the app first, then run this again.`);
  process.exit(1);
}
if (!user.passwordHash && !remove) {
  console.error(`${user.name} is a sample member who cannot sign in, so cannot moderate.`);
  process.exit(1);
}
await db().user.update({ where: { id: user.id }, data: { role: remove ? 'member' : 'moderator' } });
console.log(remove ? `${user.name} is no longer a moderator.` : `${user.name} is now a moderator. Reload the app to see Reels → Review.`);
process.exit(0);
