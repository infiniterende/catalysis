/** Assembles everything the app shows a member, from the database. */
import type {
  AppData, Comment, Conversation, Group, Highlight, JournalEntry, Message, Note, Person, Post, Prayer, PrayerLog, Tone, User,
} from '@catalysis/api';
import { db, type Prisma } from '@catalysis/db';
import { approvedVideos } from './tiktok';

const FEED_LIMIT = 100;
const PEOPLE_LIMIT = 300;
const GROUP_LIMIT = 300;
const CONVERSATION_LIMIT = 30;

type UserRow = Prisma.UserGetPayload<{ include: { milestones: true } }>;

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    email: row.email,
    role: row.role === 'moderator' ? 'moderator' : 'member',
    parish: row.parish,
    portraitUrl: row.portraitUrl ?? undefined,
    quote: row.quoteText ? { text: row.quoteText, attribution: row.quoteAttribution ?? '' } : undefined,
    booksRead: row.booksRead,
    bestStreak: row.bestStreak,
    prayerCountOffset: row.prayerCountOffset,
    milestones: [...row.milestones]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        title: m.title,
        achieved: m.achieved ?? undefined,
        progress: m.current !== null && m.total !== null ? { current: m.current, total: m.total } : undefined,
      })),
  };
}

const tally = (rows: { id: string }[]) => {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.id] = (counts[row.id] ?? 0) + 1;
  return counts;
};

export async function loadState(userId: string): Promise<(Partial<AppData> & { user: User }) | null> {
  const client = db();
  const user = await client.user.findUnique({ where: { id: userId }, include: { milestones: true } });
  if (!user) return null;

  const [
    prayers, prayerLogs, highlights, notes, bookmarks, memberships, postPrayers, reports, blocks, follows,
    intentionPrayers, rsvps, reelLikes, reelSaves, reminders, conversations,
    otherRsvps, otherIntentions, otherLikes, journal, tiktok, followers, groups,
  ] = await Promise.all([
    client.prayer.findMany({ where: { userId }, orderBy: [{ scheduledTime: 'asc' }, { position: 'asc' }] }),
    client.prayerLog.findMany({ where: { userId }, orderBy: { completedAt: 'asc' } }),
    client.highlight.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    client.note.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    client.bookmark.findMany({ where: { userId } }),
    client.membership.findMany({ where: { userId } }),
    client.postPrayer.findMany({ where: { userId }, select: { postId: true } }),
    client.report.findMany({ where: { reporterId: userId }, select: { postId: true, reelId: true } }),
    client.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    client.follow.findMany({ where: { followerId: userId }, select: { followedId: true } }),
    client.intentionPrayer.findMany({ where: { userId }, select: { intentionId: true } }),
    client.rsvp.findMany({ where: { userId }, select: { eventId: true } }),
    client.reelLike.findMany({ where: { userId }, select: { reelId: true } }),
    client.reelSave.findMany({ where: { userId }, select: { reelId: true } }),
    client.reminder.findMany({ where: { userId }, select: { key: true } }),
    client.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: CONVERSATION_LIMIT,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    }),
    client.rsvp.findMany({ where: { userId: { not: userId } }, select: { eventId: true } }),
    client.intentionPrayer.findMany({ where: { userId: { not: userId } }, select: { intentionId: true } }),
    client.reelLike.findMany({ where: { userId: { not: userId } }, select: { reelId: true } }),
    client.journalEntry.findMany({ where: { userId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    approvedVideos(),
    client.follow.findMany({ where: { followedId: userId }, select: { followerId: true }, orderBy: { createdAt: 'desc' } }),
    client.group.findMany({
      orderBy: { createdAt: 'asc' },
      take: GROUP_LIMIT,
      include: { _count: { select: { members: { where: { userId: { not: userId } } } } } },
    }),
  ]);

  const blocked = blocks.map((b) => b.blockedId);
  // The directory: everyone who follows or is followed by the member, then the most followed.
  const near = [...new Set([...followers.map((f) => f.followerId), ...follows.map((f) => f.followedId)])].filter((id) => !blocked.includes(id));
  const person = {
    id: true, name: true, handle: true, parish: true, portraitUrl: true, quoteText: true, quoteAttribution: true,
    _count: { select: { followers: { where: { followerId: { not: userId } } }, following: true } },
  } as const;
  const [nearRows, otherRows] = await Promise.all([
    client.user.findMany({ where: { id: { in: near } }, select: person }),
    client.user.findMany({
      where: { id: { notIn: [userId, ...blocked, ...near] } },
      select: person,
      orderBy: [{ followers: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: Math.max(0, PEOPLE_LIMIT - near.length),
    }),
  ]);
  const people: Person[] = [...nearRows, ...otherRows].map((p) => ({
    id: p.id,
    name: p.name,
    handle: p.handle,
    parish: p.parish,
    // A portrait kept on its owner's device cannot be shown to anyone else.
    portraitUrl: p.portraitUrl && !p.portraitUrl.startsWith('idb:') ? p.portraitUrl : undefined,
    quote: p.quoteText ? { text: p.quoteText, attribution: p.quoteAttribution ?? '' } : undefined,
    followerCount: p._count.followers,
    followingCount: p._count.following,
  }));
  const postRows = await client.post.findMany({
    where: { removedAt: null, authorId: { notIn: blocked } },
    orderBy: { createdAt: 'desc' },
    take: FEED_LIMIT,
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
      prayers: { where: { userId: { not: userId } }, select: { userId: true } },
    },
  });
  const commentRows = await client.comment.findMany({
    where: { postId: { in: postRows.map((p) => p.id) }, authorId: { notIn: blocked } },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { name: true } } },
  });

  const posts: Post[] = postRows.map((p) => ({
    id: p.id,
    type: p.type as Post['type'],
    authorId: p.authorId,
    authorName: p.author.name,
    groupId: p.groupId ?? undefined,
    body: p.body ?? undefined,
    pullQuote: p.pullQuote ?? undefined,
    media: p.mediaKind
      ? {
          kind: p.mediaKind as 'image' | 'video',
          asset: (p.mediaAsset ?? undefined) as NonNullable<Post['media']>['asset'],
          url: p.mediaUrl ?? undefined,
          focus: p.mediaFocus ?? undefined,
        }
      : undefined,
    verse: (p.verse as Post['verse'] | null) ?? undefined,
    audience: p.audience as Post['audience'],
    createdAt: p.createdAt.toISOString(),
    // Everyone else's; the member's own "I prayed" is added on top by the app.
    prayedCount: p.basePrayed + p.prayers.length,
    replyCount: p.baseReply + p._count.comments,
  }));

  const comments: Comment[] = commentRows.map((c) => ({
    id: c.id, postId: c.postId, authorId: c.authorId, authorName: c.author.name, body: c.body, createdAt: c.createdAt.toISOString(),
  }));

  return {
    user: toUser(user),
    prayers: prayers.map((p): Prayer => ({
      id: p.id, title: p.title, shortTitle: p.shortTitle ?? undefined, scheduledTime: p.scheduledTime, guidedContentId: p.guidedContentId ?? undefined,
    })),
    prayerLogs: prayerLogs.map((l): PrayerLog => ({ prayerId: l.prayerId, date: l.date, completedAt: l.completedAt.toISOString() })),
    posts,
    comments,
    prayedPostIds: postPrayers.map((p) => p.postId),
    hiddenPostIds: reports.flatMap((r) => (r.postId ? [r.postId] : [])),
    hiddenReelIds: reports.flatMap((r) => (r.reelId ? [r.reelId] : [])),
    blockedUserIds: blocked,
    rsvpEventIds: rsvps.map((r) => r.eventId),
    likedReelIds: reelLikes.map((r) => r.reelId),
    savedReelIds: reelSaves.map((r) => r.reelId),
    followingIds: follows.map((f) => f.followedId),
    followerIds: followers.map((f) => f.followerId).filter((id) => !blocked.includes(id)),
    people,
    groups: groups.map((g): Group => ({
      id: g.id, name: g.name, shortName: g.shortName, description: g.description ?? undefined,
      ownerId: g.ownerId ?? undefined, memberCount: g._count.members,
    })),
    joinedGroupIds: memberships.map((m) => m.groupId),
    prayingIntentionIds: intentionPrayers.map((i) => i.intentionId),
    reminderIds: reminders.map((r) => r.key),
    highlights: highlights.map((h): Highlight => ({
      id: h.id, bookId: h.bookId, chapter: h.chapter, verseStart: h.verseStart, verseEnd: h.verseEnd,
      text: h.text ?? undefined, color: (h.color ?? undefined) as Tone | undefined, createdAt: h.createdAt.toISOString(),
    })),
    notes: notes.map((n): Note => ({
      id: n.id, bookId: n.bookId, chapter: n.chapter, verseStart: n.verseStart, verseEnd: n.verseEnd, text: n.text, createdAt: n.createdAt.toISOString(),
    })),
    journal: journal.map((j): JournalEntry => ({
      // The member's own id for the entry: the stored one carries their account id in front.
      id: j.id.startsWith(`${userId}:`) ? j.id.slice(userId.length + 1) : j.id,
      date: j.date,
      kind: j.kind as JournalEntry['kind'],
      title: j.title ?? undefined,
      body: j.body,
      prayerId: j.prayerId ?? undefined,
      scripture: j.scripture ?? undefined,
      answeredOn: j.answeredOn ?? undefined,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    })),
    tiktok,
    bookmarks: bookmarks.map((b) => ({ bookId: b.bookId, chapter: b.chapter })),
    reading: { bookId: user.readingBook, chapter: user.readingChapter },
    reader: { scale: user.readerScale, spacing: user.readerSpacing },
    conversations: conversations.map((c): Conversation => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map((m): Message => ({
        id: m.id,
        role: m.role as Message['role'],
        content: m.content,
        citations: (m.citations as unknown as Message['citations']) ?? [],
        followUps: (m.followUps as unknown as string[]) ?? [],
        createdAt: m.createdAt.toISOString(),
        demo: m.demo || undefined,
        saved: m.saved || undefined,
        feedback: (m.feedback ?? undefined) as Message['feedback'],
      })),
    })),
    activeConversationId: conversations[0]?.id ?? null,
    others: {
      going: tally(otherRsvps.map((r) => ({ id: r.eventId }))),
      praying: tally(otherIntentions.map((r) => ({ id: r.intentionId }))),
      reelLikes: tally(otherLikes.map((r) => ({ id: r.reelId }))),
    },
  };
}
