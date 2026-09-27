/**
 * Changes a member makes, as the server receives them. The store emits one of
 * these for every action (`onChange`), the client posts them to `/api/sync`, and
 * the server writes each to the database. Every change is safe to apply twice.
 */
import type { ChapterRef } from './bible/books.ts';
import type {
  Comment, Conversation, Highlight, JournalEntry, Message, Note, Post, Prayer, User,
} from './types.ts';

export type Change =
  | { type: 'profile.update'; patch: Partial<Pick<User, 'name' | 'parish' | 'quote' | 'portraitUrl'>> }
  | { type: 'prayer.add'; prayer: Prayer }
  | { type: 'prayer.remove'; prayerId: string }
  | { type: 'prayer.log'; prayerId: string; date: string; completedAt: string }
  | { type: 'prayer.unlog'; prayerId: string; date: string }
  | { type: 'post.create'; post: Post }
  | { type: 'post.prayed'; postId: string; on: boolean }
  | { type: 'post.report'; postId: string }
  | { type: 'reel.report'; reelId: string }
  | { type: 'comment.create'; comment: Comment }
  | { type: 'user.block'; userId: string }
  | { type: 'user.follow'; userId: string; on: boolean }
  | { type: 'event.rsvp'; eventId: string; on: boolean }
  | { type: 'reel.like'; reelId: string; on: boolean }
  | { type: 'reel.save'; reelId: string; on: boolean }
  | { type: 'group.join'; groupId: string; on: boolean }
  | { type: 'group.create'; group: { id: string; name: string; description?: string } }
  | { type: 'group.delete'; groupId: string }
  | { type: 'intention.pray'; intentionId: string; on: boolean }
  | { type: 'reminder.set'; key: string; on: boolean }
  | { type: 'reading.set'; ref: ChapterRef }
  | { type: 'reader.set'; scale: number; spacing: number }
  | { type: 'bookmark.set'; ref: ChapterRef; on: boolean }
  /** The chapter's highlights after an edit; the server replaces what it holds for that chapter. */
  | { type: 'highlights.replace'; ref: ChapterRef; highlights: Highlight[] }
  | { type: 'note.save'; note: Note }
  | { type: 'note.delete'; bookId: string; chapter: number; verseStart: number }
  | { type: 'journal.save'; entry: JournalEntry }
  | { type: 'journal.delete'; entryId: string }
  | { type: 'conversation.create'; conversation: Pick<Conversation, 'id' | 'title' | 'updatedAt'> }
  | { type: 'conversation.rename'; conversationId: string; title: string }
  | { type: 'conversation.delete'; conversationId: string }
  | { type: 'message.save'; conversationId: string; message: Message };

export type ChangeType = Change['type'];

/**
 * Drops changes that a later one in the same batch makes redundant, such as the
 * many partial saves of a message while its answer is streaming in.
 */
export function compactChanges(changes: Change[]): Change[] {
  const key = (c: Change): string | undefined => {
    switch (c.type) {
      case 'message.save': return `m:${c.message.id}`;
      case 'journal.save': return `j:${c.entry.id}`;
      case 'highlights.replace': return `h:${c.ref.bookId}/${c.ref.chapter}`;
      case 'reading.set': return 'reading';
      case 'reader.set': return 'reader';
      case 'profile.update': return undefined;
      default: return undefined;
    }
  };
  const last = new Map<string, number>();
  changes.forEach((change, i) => {
    const k = key(change);
    if (k) last.set(k, i);
  });
  return changes.filter((change, i) => {
    const k = key(change);
    return !k || last.get(k) === i;
  });
}
