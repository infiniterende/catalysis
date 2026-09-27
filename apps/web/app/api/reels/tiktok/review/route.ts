import { json } from '@/lib/server/auth';
import { readJson, withMember } from '@/lib/server/route';
import { approvedVideos, isModerator, review, reviewList, type ReviewAction } from '@/lib/server/tiktok';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS: ReviewAction[] = ['approve', 'reject', 'remove'];

/** POST /api/reels/tiktok/review { id, action, topic? } → the lists as they now stand. Moderators only. */
export const POST = withMember(async ({ request, userId }) => {
  if (!(await isModerator(userId))) return json({ error: 'Only moderators can review videos.' }, { status: 403 });
  const body = await readJson(request);
  const id = typeof body?.id === 'string' && /^\d{8,24}$/.test(body.id) ? body.id : null;
  const action = ACTIONS.find((a) => a === body?.action);
  if (!id || !action) return json({ error: 'That request was not understood.' }, { status: 400 });

  const row = await review(userId, id, action, typeof body?.topic === 'string' ? body.topic : undefined);
  if (!row) return json({ error: 'That video is no longer in the list.' }, { status: 404 });
  const [videos, list] = await Promise.all([approvedVideos(), reviewList()]);
  return json({ videos, moderator: true, review: list });
});
