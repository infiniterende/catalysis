/**
 * TikTok videos in Reels.
 *
 * Nothing is downloaded or re-hosted: a video stays on TikTok and plays in
 * TikTok's own embed player. What is kept here is the record TikTok's oEmbed
 * endpoint gives for it (id, creator, caption) and whether it was approved.
 *
 * Only Christian and Catholic videos are shown. A video gets in one of two ways:
 * it comes from a creator the moderators trust and its caption passes
 * screening, or a moderator approves it. Members can report any video.
 */
import { tiktokReelId, type TikTokVideo } from '@catalysis/api';
import { db, type Prisma } from '@catalysis/db';
import { screenCaption, TOPICS, type Screening } from './screening';

const OEMBED = 'https://www.tiktok.com/oembed';
const HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);
const FEED_LIMIT = 60;

export type VideoRow = Prisma.TikTokVideoGetPayload<object>;

/** The link, if it is an https link to TikTok; otherwise `null`. */
export function parseTikTokUrl(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 300) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname.toLowerCase()) || url.username || url.port) return null;
  if (url.pathname.length < 2) return null;
  // Tracking parameters are dropped; the path is all TikTok needs.
  return `https://${url.hostname.toLowerCase()}${url.pathname}`;
}

/** A handle as TikTok writes it, without the `@`, in lower case. */
export function cleanHandle(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const handle = input.trim().replace(/^https:\/\/(www\.)?tiktok\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '').toLowerCase();
  return /^[a-z0-9._]{2,24}$/.test(handle) ? handle : null;
}

export interface Lookup {
  id: string;
  url: string;
  handle: string;
  authorName: string;
  caption: string;
}

/** Asks TikTok about a video. `null` when TikTok does not know it, or it cannot be embedded. */
export async function lookUp(url: string): Promise<Lookup | null> {
  // The member's link is only ever a query parameter to TikTok's own endpoint.
  const response = await fetch(`${OEMBED}?url=${encodeURIComponent(url)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = (await response.json()) as Record<string, unknown>;
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string).trim() : '');

  const id = text('embed_product_id') || /data-video-id="(\d+)"/.exec(text('html'))?.[1] || '';
  const handle = cleanHandle(text('author_unique_id') || text('author_url'));
  if (text('embed_type') && text('embed_type') !== 'video') return null;
  if (!/^\d{8,24}$/.test(id) || !handle) return null;
  return {
    id,
    url: `https://www.tiktok.com/@${handle}/video/${id}`,
    handle,
    authorName: text('author_name').slice(0, 80) || `@${handle}`,
    caption: text('title').slice(0, 500) || 'Untitled',
  };
}

export const toVideo = (row: VideoRow): TikTokVideo => ({
  id: row.id,
  url: row.url,
  handle: row.handle,
  authorName: row.authorName,
  caption: row.caption,
  topic: row.topic,
  approvedAt: (row.reviewedAt ?? row.createdAt).toISOString(),
});

export async function approvedVideos(): Promise<TikTokVideo[]> {
  const rows = await db().tikTokVideo.findMany({ where: { status: 'approved' }, orderBy: { reviewedAt: 'desc' }, take: FEED_LIMIT });
  return rows.map(toVideo);
}

export async function isModerator(userId: string): Promise<boolean> {
  const user = await db().user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'moderator';
}

export type Outcome =
  | { status: 'approved'; video: TikTokVideo; message: string }
  | { status: 'pending'; message: string }
  | { status: 'declined'; message: string };

/** Puts a video forward. Decides whether it goes in, waits for a moderator, or is turned away. */
export async function submit(userId: string, found: Lookup): Promise<Outcome> {
  const client = db();
  const moderator = await isModerator(userId);

  const existing = await client.tikTokVideo.findUnique({ where: { id: found.id } });
  if (existing?.status === 'approved') return { status: 'approved', video: toVideo(existing), message: 'That video is already in Reels.' };
  if (existing?.status === 'pending' && !moderator) return { status: 'pending', message: 'That video is already waiting for review.' };
  if (existing?.status === 'rejected' && !moderator) {
    return { status: 'declined', message: 'That video was reviewed and isn’t a fit for Reels, which shows Christian and Catholic videos only.' };
  }

  const trusted = Boolean(await client.tikTokCreator.findUnique({ where: { handle: found.handle }, select: { handle: true } }));
  const screening: Screening = await screenCaption(found);

  // A member's word is not enough on its own: only a trusted creator or a moderator puts a video straight in.
  const status = screening.relevant ? (moderator || trusted ? 'approved' : 'pending') : moderator ? 'pending' : 'rejected';
  const note = `${screening.relevant ? 'Looks related' : 'Looks unrelated'} (${screening.by}): ${screening.reason}`.slice(0, 300);
  const data = {
    url: found.url, handle: found.handle, authorName: found.authorName, caption: found.caption,
    topic: screening.topic, status, screening: note,
    reviewedById: status === 'approved' && moderator ? userId : null,
    reviewedAt: status === 'pending' ? null : new Date(),
  };
  const row = await client.tikTokVideo.upsert({
    where: { id: found.id },
    update: data,
    create: { id: found.id, submittedById: userId, ...data },
  });

  if (status === 'approved') return { status, video: toVideo(row), message: 'Added to Reels.' };
  if (status === 'pending') {
    return {
      status,
      message: moderator
        ? 'The caption doesn’t read as Christian or Catholic, so the video is waiting in the review list. Approve it there if it belongs.'
        : 'Thank you. A moderator will look at it before it appears in Reels.',
    };
  }
  return { status: 'declined', message: 'Reels shows Christian and Catholic videos only, and this one doesn’t appear to be. If that’s wrong, ask a moderator to add it.' };
}

export type ReviewAction = 'approve' | 'reject' | 'remove';

export async function review(userId: string, id: string, action: ReviewAction, topic?: string): Promise<VideoRow | null> {
  const client = db();
  const row = await client.tikTokVideo.findUnique({ where: { id } });
  if (!row) return null;
  const updated = await client.tikTokVideo.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      topic: topic && (TOPICS as readonly string[]).includes(topic) ? topic : row.topic,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });
  // Taking a video down settles the reports against it.
  if (action !== 'approve') {
    await client.report.updateMany({ where: { reelId: tiktokReelId(id), resolvedAt: null }, data: { resolvedAt: new Date() } });
  }
  return updated;
}

export interface ReviewList {
  pending: (TikTokVideo & { screening: string })[];
  reported: (TikTokVideo & { reports: number })[];
  creators: { handle: string; name: string }[];
}

/** What a moderator needs to decide: what is waiting, what members reported, and who is trusted. */
export async function reviewList(): Promise<ReviewList> {
  const client = db();
  const [pending, approved, creators, reports] = await Promise.all([
    client.tikTokVideo.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 100 }),
    client.tikTokVideo.findMany({ where: { status: 'approved' }, orderBy: { reviewedAt: 'desc' }, take: 300 }),
    client.tikTokCreator.findMany({ orderBy: { name: 'asc' } }),
    client.report.groupBy({ by: ['reelId'], where: { reelId: { startsWith: 'tt-' }, resolvedAt: null }, _count: { _all: true } }),
  ]);
  const counts = new Map(reports.map((r) => [r.reelId, r._count._all]));
  return {
    pending: pending.map((row) => ({ ...toVideo(row), screening: row.screening ?? '' })),
    reported: approved
      .map((row) => ({ ...toVideo(row), reports: counts.get(tiktokReelId(row.id)) ?? 0 }))
      .filter((v) => v.reports > 0)
      .sort((a, b) => b.reports - a.reports),
    creators: creators.map((c) => ({ handle: c.handle, name: c.name })),
  };
}
