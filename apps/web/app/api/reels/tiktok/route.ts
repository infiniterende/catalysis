import { allowAttempt, json } from '@/lib/server/auth';
import { readJson, withMember } from '@/lib/server/route';
import { approvedVideos, isModerator, lookUp, parseTikTokUrl, reviewList, submit } from '@/lib/server/tiktok';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reels/tiktok → `{ videos, moderator, review? }`.
 * `videos` are the approved ones; `review` is sent to moderators only.
 */
export const GET = withMember(async ({ userId }) => {
  const moderator = await isModerator(userId);
  const [videos, review] = await Promise.all([approvedVideos(), moderator ? reviewList() : undefined]);
  return json({ videos, moderator, review });
});

/** POST /api/reels/tiktok { url } → `{ status: 'approved' | 'pending' | 'declined', message, video? }`. */
export const POST = withMember(async ({ request, userId }) => {
  if (!allowAttempt(`tiktok:${userId}`, 12)) {
    return json({ error: 'That’s a lot of videos at once. Try again in a few minutes.' }, { status: 429 });
  }
  const url = parseTikTokUrl((await readJson(request))?.url);
  if (!url) return json({ error: 'Paste the link to a TikTok video, such as https://www.tiktok.com/@name/video/123.' }, { status: 400 });

  let found;
  try {
    found = await lookUp(url);
  } catch (error) {
    console.error('[tiktok] lookup', error instanceof Error ? error.message : error);
    return json({ error: 'TikTok could not be reached. Please try again in a moment.' }, { status: 502 });
  }
  if (!found) return json({ error: 'TikTok couldn’t find a public video at that link. It may be private or removed.' }, { status: 422 });

  return json(await submit(userId, found));
});
