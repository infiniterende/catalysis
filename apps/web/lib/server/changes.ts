/**
 * Writes a member's changes to the database. Everything here is input from a
 * client, so each change is validated before it is used, and each write is
 * scoped to the signed-in member: nobody can write to another member's data.
 */
import { BIBLE_BOOKS, findPrayer, GROUP_NAME, MAX_GROUPS_OWNED, shortGroupName, type Change } from '@catalysis/api';
import { db } from '@catalysis/db';
import { z } from 'zod';

const id = z.string().min(1).max(80).regex(/^[\w:.-]+$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const instant = z.string().datetime({ offset: true });
const tone = z.enum(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
const bookId = z.string().refine((value) => BIBLE_BOOKS.some((b) => b.id === value), 'Unknown book');
const chapter = z.number().int().min(1).max(150);
const verse = z.number().int().min(1).max(200);
const ref = z.object({ bookId, chapter });
const on = z.boolean();

/** Where a photo lives: on the member's device, in the uploads table, or at an https URL. */
const photoUrl = z.string().max(500).regex(/^(idb:[\w-]+|\/api\/uploads\/[a-z0-9]{20,40}|https:\/\/\S+)$/);

/** A post's media: a bundled image, a file kept on the member's device, or an https URL. */
const media = z.object({
  kind: z.enum(['image', 'video']),
  asset: z.enum(['angel', 'stJoseph', 'rosary', 'monstrance']).optional(),
  url: z.string().max(500).regex(/^(idb:[\w-]+|\/api\/uploads\/[a-z0-9]{20,40}|https:\/\/\S+|file:\/\/\S+)$/).optional(),
  focus: z.string().max(20).regex(/^[\d.%\s-]+$/).optional(),
});

const citation = z.object({
  type: z.enum(['Scripture', 'Catechism', 'Council', 'Saint']),
  reference: z.string().max(120),
  description: z.string().max(200),
});

const highlight = z.object({
  id, bookId, chapter, verseStart: verse, verseEnd: verse,
  text: z.string().max(600).optional(),
  color: tone.optional(),
  createdAt: instant,
});

const prayerBookId = id.refine((value) => findPrayer(value) !== undefined, 'Unknown prayer');

const journalEntry = z.object({
  id,
  date: isoDate,
  kind: z.enum(['free', 'gratitude', 'petition', 'examen', 'lectio']),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1).max(20000),
  prayerId: prayerBookId.optional(),
  scripture: z.string().trim().max(60).optional(),
  answeredOn: isoDate.optional(),
  createdAt: instant,
  updatedAt: instant,
});

const change = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('profile.update'),
    patch: z.object({
      name: z.string().trim().min(1).max(80).optional(),
      parish: z.string().trim().max(120).optional(),
      portraitUrl: photoUrl.optional(),
      // An empty quote takes the quote away.
      quote: z.object({ text: z.string().trim().max(400), attribution: z.string().trim().max(120) }).optional(),
    }),
  }),
  z.object({
    type: z.literal('prayer.add'),
    prayer: z.object({ id, title: z.string().trim().min(1).max(80), scheduledTime: isoTime, guidedContentId: prayerBookId.optional() }),
  }),
  z.object({ type: z.literal('prayer.remove'), prayerId: id }),
  z.object({ type: z.literal('prayer.log'), prayerId: id, date: isoDate, completedAt: instant }),
  z.object({ type: z.literal('prayer.unlog'), prayerId: id, date: isoDate }),
  z.object({
    type: z.literal('post.create'),
    post: z.object({
      id,
      type: z.enum(['reflection', 'request', 'photo', 'reel']),
      groupId: id.optional(),
      body: z.string().trim().max(2000).optional(),
      media: media.optional(),
      verse: z.object({ bookId, chapter, verse, text: z.string().max(600), label: z.string().max(60) }).optional(),
      audience: z.enum(['everyone', 'parish', 'followers']),
      createdAt: instant,
    }),
  }),
  z.object({ type: z.literal('post.prayed'), postId: id, on }),
  z.object({ type: z.literal('post.report'), postId: id }),
  z.object({ type: z.literal('reel.report'), reelId: id }),
  z.object({ type: z.literal('comment.create'), comment: z.object({ id, postId: id, body: z.string().trim().min(1).max(1000), createdAt: instant }) }),
  z.object({ type: z.literal('user.block'), userId: id }),
  z.object({ type: z.literal('user.follow'), userId: id, on }),
  z.object({ type: z.literal('event.rsvp'), eventId: id, on }),
  z.object({ type: z.literal('reel.like'), reelId: id, on }),
  z.object({ type: z.literal('reel.save'), reelId: id, on }),
  z.object({ type: z.literal('group.join'), groupId: id, on }),
  z.object({
    type: z.literal('group.create'),
    group: z.object({
      id,
      name: z.string().trim().min(GROUP_NAME.min).max(GROUP_NAME.max),
      description: z.string().trim().max(200).optional(),
    }),
  }),
  z.object({ type: z.literal('group.delete'), groupId: id }),
  z.object({ type: z.literal('intention.pray'), intentionId: id, on }),
  z.object({ type: z.literal('reminder.set'), key: id, on }),
  z.object({ type: z.literal('reading.set'), ref }),
  z.object({ type: z.literal('reader.set'), scale: z.number().min(0.5).max(2), spacing: z.number().min(0.5).max(2) }),
  z.object({ type: z.literal('bookmark.set'), ref, on }),
  z.object({ type: z.literal('highlights.replace'), ref, highlights: z.array(highlight).max(300) }),
  z.object({
    type: z.literal('note.save'),
    note: z.object({ id, bookId, chapter, verseStart: verse, verseEnd: verse, text: z.string().trim().min(1).max(4000), createdAt: instant }),
  }),
  z.object({ type: z.literal('note.delete'), bookId, chapter, verseStart: verse }),
  z.object({ type: z.literal('journal.save'), entry: journalEntry }),
  z.object({ type: z.literal('journal.delete'), entryId: id }),
  z.object({ type: z.literal('conversation.create'), conversation: z.object({ id, title: z.string().max(120), updatedAt: instant }) }),
  z.object({ type: z.literal('conversation.rename'), conversationId: id, title: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('conversation.delete'), conversationId: id }),
  z.object({
    type: z.literal('message.save'),
    conversationId: id,
    message: z.object({
      id,
      role: z.enum(['user', 'assistant']),
      content: z.string().max(20000),
      citations: z.array(citation).max(12),
      followUps: z.array(z.string().max(80)).max(4),
      createdAt: instant,
      demo: z.boolean().optional(),
      saved: z.boolean().optional(),
      feedback: z.enum(['up', 'down']).optional(),
    }),
  }),
]);

export const changes = z.array(change).min(1).max(100);

export const journalKey = (userId: string, entryId: string) => `${userId}:${entryId}`;

/** Thrown for a change that is well-formed but not allowed; the message is safe to show. */
export class Refused extends Error {}

/** Sets or clears a row of a simple "member ↔ thing" table. */
async function link(onNow: boolean, create: () => Promise<unknown>, remove: () => Promise<unknown>) {
  if (!onNow) {
    await remove();
    return;
  }
  try {
    await create();
  } catch (error) {
    // Already there (a repeated request), or the thing it points at does not exist.
    const code = (error as { code?: string }).code;
    if (code !== 'P2002' && code !== 'P2003' && code !== 'P2025') throw error;
  }
}

export async function applyChange(userId: string, input: z.infer<typeof change>): Promise<void> {
  const client = db();
  // The parsed shape is a `Change` with anything the server decides for itself left out.
  const c = input as z.infer<typeof change> & { type: Change['type'] };

  switch (c.type) {
    case 'profile.update': {
      const { name, parish, portraitUrl, quote } = c.patch;
      await client.user.update({
        where: { id: userId },
        data: {
          name, parish, portraitUrl,
          ...(quote ? (quote.text ? { quoteText: quote.text, quoteAttribution: quote.attribution } : { quoteText: null, quoteAttribution: null }) : {}),
        },
      });
      return;
    }

    case 'prayer.add': {
      const count = await client.prayer.count({ where: { userId } });
      if (count >= 30) throw new Refused('A rule of life can hold up to thirty prayers.');
      await client.prayer.upsert({
        where: { id: c.prayer.id },
        update: {},
        create: {
          id: c.prayer.id, userId, title: c.prayer.title, scheduledTime: c.prayer.scheduledTime,
          guidedContentId: c.prayer.guidedContentId, position: count,
        },
      });
      return;
    }
    case 'prayer.remove':
      await client.prayer.deleteMany({ where: { id: c.prayerId, userId } });
      return;
    case 'prayer.log': {
      const prayer = await client.prayer.findFirst({ where: { id: c.prayerId, userId }, select: { id: true } });
      if (!prayer) return;
      await client.prayerLog.upsert({
        where: { userId_prayerId_date: { userId, prayerId: c.prayerId, date: c.date } },
        update: {},
        create: { userId, prayerId: c.prayerId, date: c.date, completedAt: new Date(c.completedAt) },
      });
      return;
    }
    case 'prayer.unlog':
      await client.prayerLog.deleteMany({ where: { userId, prayerId: c.prayerId, date: c.date } });
      return;

    case 'post.create': {
      const { post } = c;
      if (!post.body && !post.media) throw new Refused('A post needs some words or a photo.');
      const group = post.groupId ? await client.group.findUnique({ where: { id: post.groupId }, select: { id: true } }) : null;
      await client.post.upsert({
        where: { id: post.id },
        update: {},
        create: {
          id: post.id,
          type: post.type,
          authorId: userId,
          groupId: group?.id,
          body: post.body,
          mediaKind: post.media?.kind,
          mediaAsset: post.media?.asset,
          mediaUrl: post.media?.url,
          mediaFocus: post.media?.focus,
          verse: post.verse,
          audience: post.audience,
        },
      });
      return;
    }
    case 'post.prayed':
      await link(
        c.on,
        () => client.postPrayer.create({ data: { postId: c.postId, userId } }),
        () => client.postPrayer.deleteMany({ where: { postId: c.postId, userId } }),
      );
      return;
    case 'post.report': {
      const post = await client.post.findUnique({ where: { id: c.postId }, select: { authorId: true } });
      if (!post) return;
      // Reporting your own post takes it down; reporting another's queues it for review.
      if (post.authorId === userId) await client.post.update({ where: { id: c.postId }, data: { removedAt: new Date() } });
      else await link(true, () => client.report.create({ data: { reporterId: userId, postId: c.postId } }), async () => undefined);
      return;
    }
    case 'reel.report':
      await link(true, () => client.report.create({ data: { reporterId: userId, reelId: c.reelId } }), async () => undefined);
      return;
    case 'comment.create': {
      const post = await client.post.findFirst({ where: { id: c.comment.postId, removedAt: null }, select: { id: true } });
      if (!post) throw new Refused('That post is no longer available.');
      await client.comment.upsert({
        where: { id: c.comment.id },
        update: {},
        create: { id: c.comment.id, postId: post.id, authorId: userId, body: c.comment.body },
      });
      return;
    }

    case 'user.block':
      if (c.userId === userId) return;
      await link(true, () => client.block.create({ data: { blockerId: userId, blockedId: c.userId } }), async () => undefined);
      await client.follow.deleteMany({ where: { followerId: userId, followedId: c.userId } });
      return;
    case 'user.follow':
      if (c.userId === userId) return;
      await link(
        c.on,
        () => client.follow.create({ data: { followerId: userId, followedId: c.userId } }),
        () => client.follow.deleteMany({ where: { followerId: userId, followedId: c.userId } }),
      );
      return;
    case 'event.rsvp':
      await link(
        c.on,
        () => client.rsvp.create({ data: { eventId: c.eventId, userId } }),
        () => client.rsvp.deleteMany({ where: { eventId: c.eventId, userId } }),
      );
      return;
    case 'reel.like':
      await link(
        c.on,
        () => client.reelLike.create({ data: { reelId: c.reelId, userId } }),
        () => client.reelLike.deleteMany({ where: { reelId: c.reelId, userId } }),
      );
      return;
    case 'reel.save':
      await link(
        c.on,
        () => client.reelSave.create({ data: { reelId: c.reelId, userId } }),
        () => client.reelSave.deleteMany({ where: { reelId: c.reelId, userId } }),
      );
      return;
    case 'group.join':
      await link(
        c.on,
        () => client.membership.create({ data: { groupId: c.groupId, userId } }),
        () => client.membership.deleteMany({ where: { groupId: c.groupId, userId } }),
      );
      return;
    case 'group.create': {
      const name = c.group.name.replace(/\s+/g, ' ');
      if (await client.group.findUnique({ where: { id: c.group.id }, select: { id: true } })) return;
      if (await client.group.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true } })) {
        throw new Refused('A group with that name already exists.');
      }
      if ((await client.group.count({ where: { ownerId: userId } })) >= MAX_GROUPS_OWNED) {
        throw new Refused(`You can look after up to ${MAX_GROUPS_OWNED} groups.`);
      }
      await client.group.create({
        data: {
          id: c.group.id, name, shortName: shortGroupName(name), description: c.group.description || null, ownerId: userId,
          members: { create: { userId } },
        },
      });
      return;
    }
    case 'group.delete':
      // Only the founder can close a group. Its posts stay, no longer tied to it.
      await client.group.deleteMany({ where: { id: c.groupId, ownerId: userId } });
      return;
    case 'intention.pray':
      await link(
        c.on,
        () => client.intentionPrayer.create({ data: { intentionId: c.intentionId, userId } }),
        () => client.intentionPrayer.deleteMany({ where: { intentionId: c.intentionId, userId } }),
      );
      return;
    case 'reminder.set':
      await link(
        c.on,
        () => client.reminder.create({ data: { key: c.key, userId } }),
        () => client.reminder.deleteMany({ where: { key: c.key, userId } }),
      );
      return;

    case 'reading.set':
      await client.user.update({ where: { id: userId }, data: { readingBook: c.ref.bookId, readingChapter: c.ref.chapter } });
      return;
    case 'reader.set':
      await client.user.update({ where: { id: userId }, data: { readerScale: c.scale, readerSpacing: c.spacing } });
      return;
    case 'bookmark.set':
      await link(
        c.on,
        () => client.bookmark.create({ data: { userId, bookId: c.ref.bookId, chapter: c.ref.chapter } }),
        () => client.bookmark.deleteMany({ where: { userId, bookId: c.ref.bookId, chapter: c.ref.chapter } }),
      );
      return;
    case 'highlights.replace': {
      const rows = c.highlights
        .filter((h) => h.bookId === c.ref.bookId && h.chapter === c.ref.chapter && h.verseEnd >= h.verseStart)
        .map((h) => ({
          // Ids are namespaced by member, so one member can never overwrite another's row.
          id: `${userId}:${h.id}`.slice(0, 120),
          userId, bookId: h.bookId, chapter: h.chapter, verseStart: h.verseStart, verseEnd: h.verseEnd,
          text: h.text, color: h.color, createdAt: new Date(h.createdAt),
        }));
      await client.$transaction([
        client.highlight.deleteMany({ where: { userId, bookId: c.ref.bookId, chapter: c.ref.chapter } }),
        client.highlight.createMany({ data: rows, skipDuplicates: true }),
      ]);
      return;
    }
    case 'note.save': {
      const { note } = c;
      const where = { userId_bookId_chapter_verseStart: { userId, bookId: note.bookId, chapter: note.chapter, verseStart: note.verseStart } };
      await client.note.upsert({
        where,
        update: { text: note.text, verseEnd: note.verseEnd },
        create: {
          id: `${userId}:${note.id}`.slice(0, 120),
          userId, bookId: note.bookId, chapter: note.chapter, verseStart: note.verseStart, verseEnd: note.verseEnd, text: note.text,
        },
      });
      return;
    }
    case 'note.delete':
      await client.note.deleteMany({ where: { userId, bookId: c.bookId, chapter: c.chapter, verseStart: c.verseStart } });
      return;

    case 'journal.save': {
      const { entry } = c;
      // Ids are namespaced by member, so one member can never read or overwrite another's entry.
      const key = journalKey(userId, entry.id);
      const data = {
        date: entry.date, kind: entry.kind, title: entry.title ?? null, body: entry.body,
        prayerId: entry.prayerId ?? null, scripture: entry.scripture ?? null,
        answeredOn: entry.kind === 'petition' ? (entry.answeredOn ?? null) : null,
        updatedAt: new Date(entry.updatedAt),
      };
      const existing = await client.journalEntry.findUnique({ where: { id: key }, select: { id: true } });
      if (!existing && (await client.journalEntry.count({ where: { userId } })) >= 5000) {
        throw new Refused('The journal is full. Remove an entry to write another.');
      }
      await client.journalEntry.upsert({
        where: { id: key },
        update: data,
        create: { id: key, userId, createdAt: new Date(entry.createdAt), ...data },
      });
      return;
    }
    case 'journal.delete':
      await client.journalEntry.deleteMany({ where: { id: journalKey(userId, c.entryId), userId } });
      return;

    case 'conversation.create': {
      const existing = await client.conversation.findUnique({ where: { id: c.conversation.id }, select: { userId: true } });
      if (existing) return;
      await client.conversation.create({
        data: { id: c.conversation.id, userId, title: c.conversation.title, updatedAt: new Date(c.conversation.updatedAt) },
      });
      return;
    }
    case 'conversation.rename':
      await client.conversation.updateMany({ where: { id: c.conversationId, userId }, data: { title: c.title } });
      return;
    case 'conversation.delete':
      await client.conversation.deleteMany({ where: { id: c.conversationId, userId } });
      return;
    case 'message.save': {
      const conversation = await client.conversation.findFirst({ where: { id: c.conversationId, userId }, select: { id: true } });
      if (!conversation) return;
      const { message } = c;
      const data = {
        role: message.role,
        content: message.content,
        citations: message.citations,
        followUps: message.followUps,
        demo: message.demo ?? false,
        saved: message.saved ?? false,
        feedback: message.feedback ?? null,
      };
      const existing = await client.message.findUnique({ where: { id: message.id }, select: { conversationId: true } });
      if (existing && existing.conversationId !== conversation.id) return;
      await client.message.upsert({
        where: { id: message.id },
        update: data,
        create: { id: message.id, conversationId: conversation.id, createdAt: new Date(message.createdAt), ...data },
      });
      await client.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      return;
    }
  }
}
