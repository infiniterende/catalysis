import { db } from '@catalysis/db';
import { json } from '@/lib/server/auth';
import { readJson, withMember } from '@/lib/server/route';
import { approvedVideos, cleanHandle, isModerator, reviewList } from '@/lib/server/tiktok';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/reels/tiktok/creators { handle, name?, on } → the lists as they now stand.
 * A trusted creator's videos go into Reels without waiting, if the caption passes screening.
 * Moderators only.
 */
export const POST = withMember(async ({ request, userId }) => {
  if (!(await isModerator(userId))) return json({ error: 'Only moderators can change trusted creators.' }, { status: 403 });
  const body = await readJson(request);
  const handle = cleanHandle(body?.handle);
  if (!handle || typeof body?.on !== 'boolean') return json({ error: 'Enter a TikTok handle, such as @name.' }, { status: 400 });

  if (body.on) {
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : `@${handle}`;
    await db().tikTokCreator.upsert({ where: { handle }, update: { name }, create: { handle, name, addedById: userId } });
  } else {
    await db().tikTokCreator.deleteMany({ where: { handle } });
  }
  const [videos, list] = await Promise.all([approvedVideos(), reviewList()]);
  return json({ videos, moderator: true, review: list });
});
