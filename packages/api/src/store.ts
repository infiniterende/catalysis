/**
 * App state, shared by web and mobile. Each app creates one store with its own
 * storage (localStorage / AsyncStorage) and reads it through zustand's `useStore`.
 *
 * This is the local data client: everything a user changes is kept on the
 * device. The actions are the seam for a real backend — each maps to one
 * table write in the suggested data model (PrayerLog, Reaction, RSVP, …).
 */
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import type { ChapterRef } from './bible/books.ts';
import { toISODate } from './format.ts';
import { longestStreak } from './prayer.ts';
import type { Change } from './sync.ts';
import {
  buildSeed, DEFAULT_PRAYERS, DEMO_USER, EVENTS, GROUPS, MY_GROUP_IDS, PEOPLE, REELS, SEED_FOLLOWERS, SEED_FOLLOWING, SEED_RSVPS,
} from './seed.ts';
import type {
  Audience, CalendarEvent, Comment, Conversation, Group, Highlight, ISODate, JournalEntry, JournalKind, Media, Message,
  Milestone, Note, Person, Post, PostType, Prayer, PrayerLog, Reel, TikTokVideo, User, VerseRef,
} from './types.ts';

export interface ReaderSettings {
  /** Multiplier on the scripture size: 0.9, 1, 1.15, 1.3. */
  scale: number;
  /** Multiplier on the line height: 0.9, 1, 1.15. */
  spacing: number;
}

export interface AppData {
  user: User | null;
  prayers: Prayer[];
  prayerLogs: PrayerLog[];
  posts: Post[];
  comments: Comment[];
  prayedPostIds: string[];
  hiddenPostIds: string[];
  hiddenReelIds: string[];
  blockedUserIds: string[];
  rsvpEventIds: string[];
  likedReelIds: string[];
  savedReelIds: string[];
  followingIds: string[];
  /** Members who follow this member. */
  followerIds: string[];
  /** Other members, for profiles, follower lists and Discover. */
  people: Person[];
  /** Every group, whether joined or not. */
  groups: Group[];
  joinedGroupIds: string[];
  prayingIntentionIds: string[];
  /** Things the user asked to be reminded of (e.g. tonight's Rosary). */
  reminderIds: string[];
  highlights: Highlight[];
  notes: Note[];
  /** The prayer journal, newest first. */
  journal: JournalEntry[];
  /** TikTok videos approved for Reels. Empty on a device that keeps its own data. */
  tiktok: TikTokVideo[];
  bookmarks: ChapterRef[];
  reading: ChapterRef;
  reader: ReaderSettings;
  conversations: Conversation[];
  activeConversationId: string | null;
  /**
   * How many other members are going to each event and praying each intention.
   * Empty on a device that keeps its own data; filled from the server otherwise.
   */
  others: { going: Record<string, number>; praying: Record<string, number>; reelLikes: Record<string, number> };
}

export interface NewPost {
  type: PostType;
  body?: string;
  media?: Media;
  verse?: VerseRef;
  groupId?: string;
  audience: Audience;
}

export interface JournalDraft {
  /** Set to change an entry; leave out to write a new one. */
  id?: string;
  date?: ISODate;
  kind: JournalKind;
  title?: string;
  body: string;
  prayerId?: string;
  scripture?: string;
}

export interface AppActions {
  /** Starts a session. The demo account is filled with the design's sample history. */
  startSession(user: User, now?: Date): void;
  /** Replaces what is on the device with the member's data from the server. */
  loadRemote(data: Partial<AppData> & { user: User }): void;
  signOut(): void;
  updateProfile(patch: Partial<Pick<User, 'name' | 'parish' | 'quote' | 'portraitUrl'>>): void;

  togglePrayer(prayerId: string, now?: Date): void;
  /** `guidedContentId` ties the prayer to a page of the prayer book; a prayer is added from the book once. */
  addPrayer(input: { title: string; scheduledTime: string; guidedContentId?: string }): void;
  removePrayer(prayerId: string): void;

  addPost(input: NewPost, now?: Date): Post | undefined;
  togglePrayed(postId: string): void;
  addComment(postId: string, body: string, now?: Date): void;
  /** Hides the post on this device and queues it for moderation. */
  reportPost(postId: string): void;
  /** Hides the reel on this device and queues it for moderation. */
  reportReel(reelId: string): void;
  blockUser(userId: string): void;

  toggleRsvp(eventId: string): void;
  toggleLike(reelId: string): void;
  toggleSave(reelId: string): void;
  toggleFollow(userId: string): void;
  toggleGroup(groupId: string): void;
  /** Starts a group, which its founder joins. Returns it, or a message saying why not. */
  createGroup(input: { name: string; description?: string }): { ok: true; group: Group } | { ok: false; error: string };
  /** Closes a group. Only its founder can; its posts stay in the feed. */
  deleteGroup(groupId: string): void;
  toggleIntention(intentionId: string): void;
  toggleReminder(id: string): void;

  setReading(ref: ChapterRef): void;
  setReader(patch: Partial<ReaderSettings>): void;
  toggleBookmark(ref: ChapterRef): void;
  addHighlight(input: Omit<Highlight, 'id' | 'createdAt'>, now?: Date): void;
  removeHighlights(bookId: string, chapter: number, verse: number): void;
  /**
   * Clears highlighting from the given verses and nowhere else: a highlight that
   * runs over several verses keeps the part outside them. `whole` leaves
   * highlighted phrases alone and clears only whole-verse highlighting.
   */
  clearHighlights(bookId: string, chapter: number, verses: number[], scope?: 'all' | 'whole'): void;
  saveNote(input: Omit<Note, 'id' | 'createdAt'>, now?: Date): void;
  deleteNote(noteId: string): void;

  /** Writes or changes a journal entry. An entry with no words is not kept. */
  saveJournalEntry(draft: JournalDraft, now?: Date): JournalEntry | undefined;
  deleteJournalEntry(entryId: string): void;
  /** Marks a petition answered, or takes the mark away. */
  toggleAnswered(entryId: string, now?: Date): void;
  /** Replaces the approved TikTok videos, after the server sends a fresh list. */
  setTikTok(videos: TikTokVideo[]): void;

  /** Returns the new conversation's id. */
  startConversation(title?: string, now?: Date): string;
  setActiveConversation(id: string | null): void;
  appendMessage(conversationId: string, message: Message): void;
  updateMessage(conversationId: string, messageId: string, patch: Partial<Message>): void;
  renameConversation(conversationId: string, title: string): void;
  deleteConversation(conversationId: string): void;
}

export type AppState = AppData & AppActions & {
  /** False until persisted state has been read; render skeletons meanwhile. */
  hydrated: boolean;
};

const EMPTY: AppData = {
  user: null,
  prayers: DEFAULT_PRAYERS,
  prayerLogs: [],
  posts: [],
  comments: [],
  prayedPostIds: [],
  hiddenPostIds: [],
  hiddenReelIds: [],
  blockedUserIds: [],
  rsvpEventIds: [],
  likedReelIds: [],
  savedReelIds: [],
  followingIds: [],
  followerIds: [],
  people: PEOPLE,
  groups: GROUPS,
  joinedGroupIds: [],
  prayingIntentionIds: [],
  reminderIds: [],
  highlights: [],
  notes: [],
  journal: [],
  tiktok: [],
  bookmarks: [],
  reading: { bookId: 'JHN', chapter: 1 },
  reader: { scale: 1, spacing: 1 },
  conversations: [],
  activeConversationId: null,
  others: { going: {}, praying: {}, reelLikes: {} },
};

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const GROUP_NAME = { min: 3, max: 60 };
export const MAX_GROUPS_OWNED = 10;

/** The name as it appears in tight places, such as under a post. */
export function shortGroupName(name: string): string {
  const head = name.split(/[,·(–—-]\s/)[0]?.trim() ?? name;
  return head.length > 26 ? `${head.slice(0, 25).trimEnd()}…` : head;
}

/** Newest day first; within a day, the latest written first. */
const sortJournal = (entries: JournalEntry[]) =>
  [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const sameRef = (a: ChapterRef, b: ChapterRef) => a.bookId === b.bookId && a.chapter === b.chapter;

export type AppStore = ReturnType<typeof createAppStore>;

export interface StoreOptions {
  /** Called with every change a member makes, so it can be sent to the server. */
  onChange?: (change: Change) => void;
}

export function createAppStore(storage: StateStorage, name = 'catalysis', options: StoreOptions = {}) {
  const emit = (change: Change) => options.onChange?.(change);
  return createStore<AppState>()(
    persist(
      (set, get) => {
        /** Highlights are sent a chapter at a time: edits split and merge them, so the whole set is simplest. */
        const emitHighlights = (ref: ChapterRef) =>
          emit({
            type: 'highlights.replace',
            ref: { bookId: ref.bookId, chapter: ref.chapter },
            highlights: get().highlights.filter((h) => h.bookId === ref.bookId && h.chapter === ref.chapter),
          });
        return {
        ...EMPTY,
        hydrated: false,

        startSession(user, now = new Date()) {
          if (user.id !== DEMO_USER.id) {
            // The community is shared, so a new member still sees the feed.
            const seed = buildSeed(now);
            set({ ...EMPTY, user, posts: seed.posts, comments: seed.comments });
            return;
          }
          const seed = buildSeed(now);
          set({
            ...EMPTY,
            user: { ...user, prayerCountOffset: seed.prayerCountOffset },
            prayerLogs: seed.prayerLogs,
            posts: seed.posts,
            comments: seed.comments,
            prayedPostIds: seed.prayedPostIds,
            rsvpEventIds: SEED_RSVPS,
            followingIds: SEED_FOLLOWING,
            followerIds: SEED_FOLLOWERS,
            joinedGroupIds: MY_GROUP_IDS,
            highlights: seed.highlights,
            journal: seed.journal,
            conversations: seed.conversations,
            activeConversationId: seed.conversations[0]?.id ?? null,
          });
        },

        loadRemote(data) {
          set({ ...EMPTY, ...data });
        },

        signOut() {
          set({ ...EMPTY });
        },

        updateProfile(patch) {
          const user = get().user;
          if (!user) return;
          const next = { ...user, ...patch };
          // An empty quote takes the quote away.
          if (patch.quote && !patch.quote.text.trim()) next.quote = undefined;
          set({ user: next });
          emit({ type: 'profile.update', patch });
        },

        togglePrayer(prayerId, now = new Date()) {
          const date = toISODate(now);
          const logs = get().prayerLogs;
          const existing = logs.some((l) => l.prayerId === prayerId && l.date === date);
          emit(existing ? { type: 'prayer.unlog', prayerId, date } : { type: 'prayer.log', prayerId, date, completedAt: now.toISOString() });
          set({
            prayerLogs: existing
              ? logs.filter((l) => !(l.prayerId === prayerId && l.date === date))
              : [...logs, { prayerId, date, completedAt: now.toISOString() }],
          });
        },

        addPrayer({ title, scheduledTime, guidedContentId }) {
          const clean = title.trim();
          if (!clean) return;
          if (guidedContentId && get().prayers.some((p) => p.guidedContentId === guidedContentId)) return;
          const prayer: Prayer = { id: newId('p'), title: clean, scheduledTime, guidedContentId };
          set({ prayers: [...get().prayers, prayer] });
          emit({ type: 'prayer.add', prayer });
        },

        removePrayer(prayerId) {
          emit({ type: 'prayer.remove', prayerId });
          set({
            prayers: get().prayers.filter((p) => p.id !== prayerId),
            prayerLogs: get().prayerLogs.filter((l) => l.prayerId !== prayerId),
          });
        },

        addPost(input, now = new Date()) {
          const user = get().user;
          if (!user) return undefined;
          const body = input.body?.trim();
          if (!body && !input.media) return undefined;
          const post: Post = {
            id: newId('post'),
            type: input.type,
            authorId: user.id,
            authorName: user.name,
            groupId: input.groupId,
            body,
            media: input.media,
            verse: input.verse,
            audience: input.audience,
            createdAt: now.toISOString(),
            prayedCount: 0,
            replyCount: 0,
          };
          set({ posts: [post, ...get().posts] });
          emit({ type: 'post.create', post });
          return post;
        },

        togglePrayed(postId) {
          emit({ type: 'post.prayed', postId, on: !get().prayedPostIds.includes(postId) });
          set({ prayedPostIds: toggle(get().prayedPostIds, postId) });
        },

        addComment(postId, body, now = new Date()) {
          const user = get().user;
          const clean = body.trim();
          if (!user || !clean) return;
          const comment: Comment = {
            id: newId('c'), postId, authorId: user.id, authorName: user.name, body: clean, createdAt: now.toISOString(),
          };
          emit({ type: 'comment.create', comment });
          set({
            comments: [...get().comments, comment],
            posts: get().posts.map((p) => (p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p)),
          });
        },

        reportPost(postId) {
          emit({ type: 'post.report', postId });
          if (!get().hiddenPostIds.includes(postId)) set({ hiddenPostIds: [...get().hiddenPostIds, postId] });
        },

        reportReel(reelId) {
          emit({ type: 'reel.report', reelId });
          if (!get().hiddenReelIds.includes(reelId)) set({ hiddenReelIds: [...get().hiddenReelIds, reelId] });
        },

        blockUser(userId) {
          emit({ type: 'user.block', userId });
          if (!get().blockedUserIds.includes(userId)) set({ blockedUserIds: [...get().blockedUserIds, userId] });
        },

        toggleRsvp(eventId) {
          emit({ type: 'event.rsvp', eventId, on: !get().rsvpEventIds.includes(eventId) });
          set({ rsvpEventIds: toggle(get().rsvpEventIds, eventId) });
        },
        toggleLike(reelId) {
          emit({ type: 'reel.like', reelId, on: !get().likedReelIds.includes(reelId) });
          set({ likedReelIds: toggle(get().likedReelIds, reelId) });
        },
        toggleSave(reelId) {
          emit({ type: 'reel.save', reelId, on: !get().savedReelIds.includes(reelId) });
          set({ savedReelIds: toggle(get().savedReelIds, reelId) });
        },
        toggleFollow(userId) {
          emit({ type: 'user.follow', userId, on: !get().followingIds.includes(userId) });
          set({ followingIds: toggle(get().followingIds, userId) });
        },
        toggleGroup(groupId) {
          emit({ type: 'group.join', groupId, on: !get().joinedGroupIds.includes(groupId) });
          set({ joinedGroupIds: toggle(get().joinedGroupIds, groupId) });
        },
        createGroup({ name, description }) {
          const user = get().user;
          const clean = name.trim().replace(/\s+/g, ' ');
          if (!user) return { ok: false, error: 'Log in to start a group.' };
          if (clean.length < GROUP_NAME.min) return { ok: false, error: 'Give the group a name of at least three letters.' };
          if (clean.length > GROUP_NAME.max) return { ok: false, error: `Keep the name under ${GROUP_NAME.max} characters.` };
          if (get().groups.some((g) => g.name.toLowerCase() === clean.toLowerCase())) {
            return { ok: false, error: 'A group with that name already exists. Join it, or choose another name.' };
          }
          if (get().groups.filter((g) => g.ownerId === user.id).length >= MAX_GROUPS_OWNED) {
            return { ok: false, error: `You can look after up to ${MAX_GROUPS_OWNED} groups.` };
          }
          const about = description?.trim().slice(0, 200) || undefined;
          const group: Group = { id: newId('g'), name: clean, shortName: shortGroupName(clean), description: about, ownerId: user.id, memberCount: 0 };
          set({ groups: [...get().groups, group], joinedGroupIds: [...get().joinedGroupIds, group.id] });
          emit({ type: 'group.create', group: { id: group.id, name: group.name, description: about } });
          return { ok: true, group };
        },

        deleteGroup(groupId) {
          const group = get().groups.find((g) => g.id === groupId);
          if (!group || !group.ownerId || group.ownerId !== get().user?.id) return;
          set({
            groups: get().groups.filter((g) => g.id !== groupId),
            joinedGroupIds: get().joinedGroupIds.filter((id) => id !== groupId),
            posts: get().posts.map((p) => (p.groupId === groupId ? { ...p, groupId: undefined } : p)),
          });
          emit({ type: 'group.delete', groupId });
        },

        toggleIntention(id) {
          emit({ type: 'intention.pray', intentionId: id, on: !get().prayingIntentionIds.includes(id) });
          set({ prayingIntentionIds: toggle(get().prayingIntentionIds, id) });
        },
        toggleReminder(id) {
          emit({ type: 'reminder.set', key: id, on: !get().reminderIds.includes(id) });
          set({ reminderIds: toggle(get().reminderIds, id) });
        },

        setReading(ref) {
          const current = get().reading;
          if (current.bookId === ref.bookId && current.chapter === ref.chapter) return;
          set({ reading: ref });
          emit({ type: 'reading.set', ref });
        },
        setReader(patch) {
          const reader = { ...get().reader, ...patch };
          set({ reader });
          emit({ type: 'reader.set', ...reader });
        },

        toggleBookmark(ref) {
          const bookmarks = get().bookmarks;
          emit({ type: 'bookmark.set', ref, on: !bookmarks.some((b) => sameRef(b, ref)) });
          set({
            bookmarks: bookmarks.some((b) => sameRef(b, ref))
              ? bookmarks.filter((b) => !sameRef(b, ref))
              : [...bookmarks, ref],
          });
        },

        addHighlight(input, now = new Date()) {
          set({ highlights: [...get().highlights, { ...input, id: newId('h'), createdAt: now.toISOString() }] });
          emitHighlights(input);
        },

        removeHighlights(bookId, chapter, verse) {
          set({
            highlights: get().highlights.filter(
              (h) => !(h.bookId === bookId && h.chapter === chapter && verse >= h.verseStart && verse <= h.verseEnd),
            ),
          });
          emitHighlights({ bookId, chapter });
        },

        clearHighlights(bookId, chapter, verses, scope = 'all') {
          const cleared = new Set(verses);
          const next: Highlight[] = [];
          for (const h of get().highlights) {
            const here = h.bookId === bookId && h.chapter === chapter;
            const touched = here && verses.some((v) => v >= h.verseStart && v <= h.verseEnd);
            if (!touched || (scope === 'whole' && h.text)) {
              next.push(h);
              continue;
            }
            // A phrase belongs to one verse, so it goes entirely. A run of verses is cut down to what is left.
            if (h.text) continue;
            let start: number | null = null;
            for (let v = h.verseStart; v <= h.verseEnd + 1; v++) {
              const keep = v <= h.verseEnd && !cleared.has(v);
              if (keep && start === null) start = v;
              if (!keep && start !== null) {
                next.push({ ...h, id: newId('h'), verseStart: start, verseEnd: v - 1 });
                start = null;
              }
            }
          }
          set({ highlights: next });
          emitHighlights({ bookId, chapter });
        },

        saveNote(input, now = new Date()) {
          const text = input.text.trim();
          const others = get().notes.filter(
            (n) => !(n.bookId === input.bookId && n.chapter === input.chapter && n.verseStart === input.verseStart),
          );
          const note = { ...input, text, id: newId('n'), createdAt: now.toISOString() };
          set({ notes: text ? [...others, note] : others });
          emit(text
            ? { type: 'note.save', note }
            : { type: 'note.delete', bookId: input.bookId, chapter: input.chapter, verseStart: input.verseStart });
        },

        deleteNote(noteId) {
          const note = get().notes.find((n) => n.id === noteId);
          set({ notes: get().notes.filter((n) => n.id !== noteId) });
          if (note) emit({ type: 'note.delete', bookId: note.bookId, chapter: note.chapter, verseStart: note.verseStart });
        },

        saveJournalEntry(draft, now = new Date()) {
          const body = draft.body.trim();
          const existing = draft.id ? get().journal.find((e) => e.id === draft.id) : undefined;
          if (!body) return undefined;
          const stamp = now.toISOString();
          const entry: JournalEntry = {
            id: existing?.id ?? newId('j'),
            date: draft.date ?? existing?.date ?? toISODate(now),
            kind: draft.kind,
            title: draft.title?.trim() || undefined,
            body,
            prayerId: draft.prayerId ?? existing?.prayerId,
            scripture: draft.scripture?.trim() || undefined,
            // Only a petition can be answered; the mark goes if the entry stops being one.
            answeredOn: draft.kind === 'petition' ? existing?.answeredOn : undefined,
            createdAt: existing?.createdAt ?? stamp,
            updatedAt: stamp,
          };
          set({ journal: sortJournal([entry, ...get().journal.filter((e) => e.id !== entry.id)]) });
          emit({ type: 'journal.save', entry });
          return entry;
        },

        deleteJournalEntry(entryId) {
          if (!get().journal.some((e) => e.id === entryId)) return;
          set({ journal: get().journal.filter((e) => e.id !== entryId) });
          emit({ type: 'journal.delete', entryId });
        },

        toggleAnswered(entryId, now = new Date()) {
          const found = get().journal.find((e) => e.id === entryId);
          if (!found || found.kind !== 'petition') return;
          const entry = { ...found, answeredOn: found.answeredOn ? undefined : toISODate(now), updatedAt: now.toISOString() };
          set({ journal: get().journal.map((e) => (e.id === entryId ? entry : e)) });
          emit({ type: 'journal.save', entry });
        },

        setTikTok: (videos) => set({ tiktok: videos }),

        startConversation(title = 'New conversation', now = new Date()) {
          const conversation: Conversation = { id: newId('conv'), title, messages: [], updatedAt: now.toISOString() };
          // Drop untouched drafts so the history only lists real conversations.
          const kept = get().conversations.filter((c) => c.messages.length > 0);
          set({ conversations: [conversation, ...kept], activeConversationId: conversation.id });
          emit({ type: 'conversation.create', conversation: { id: conversation.id, title, updatedAt: conversation.updatedAt } });
          return conversation.id;
        },

        setActiveConversation: (id) => set({ activeConversationId: id }),

        appendMessage(conversationId, message) {
          emit({ type: 'message.save', conversationId, message });
          set({
            conversations: get().conversations.map((c) =>
              c.id === conversationId ? { ...c, messages: [...c.messages, message], updatedAt: message.createdAt } : c,
            ),
          });
        },

        updateMessage(conversationId, messageId, patch) {
          set({
            conversations: get().conversations.map((c) =>
              c.id === conversationId
                ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) }
                : c,
            ),
          });
          const message = get().conversations.find((c) => c.id === conversationId)?.messages.find((m) => m.id === messageId);
          if (message) emit({ type: 'message.save', conversationId, message });
        },

        renameConversation(conversationId, title) {
          emit({ type: 'conversation.rename', conversationId, title });
          set({ conversations: get().conversations.map((c) => (c.id === conversationId ? { ...c, title } : c)) });
        },

        deleteConversation(conversationId) {
          emit({ type: 'conversation.delete', conversationId });
          const conversations = get().conversations.filter((c) => c.id !== conversationId);
          set({
            conversations,
            activeConversationId:
              get().activeConversationId === conversationId ? (conversations[0]?.id ?? null) : get().activeConversationId,
          });
        },
        };
      },
      {
        name,
        version: 1,
        storage: createJSONStorage(() => storage),
        // Hydrate explicitly (`store.persist.rehydrate()`) so server and first client render agree.
        skipHydration: true,
        partialize: ({ hydrated: _hydrated, ...rest }) => rest,
        onRehydrateStorage: () => (_state, error) => {
          if (error) console.warn('Catalysis: could not read saved state', error);
        },
      },
    ),
  );
}

/** Rehydrates a store and flips `hydrated` once saved state has been read. */
export async function hydrateStore(store: AppStore): Promise<void> {
  try {
    await store.persist.rehydrate();
  } finally {
    store.setState({ hydrated: true });
  }
}

/* ---------- derived values ---------- */

export const isSignedIn = (s: AppData) => s.user !== null;

export function visiblePosts(s: AppData): Post[] {
  return s.posts.filter((p) => !s.hiddenPostIds.includes(p.id) && !s.blockedUserIds.includes(p.authorId));
}

export type FeedId = 'forYou' | 'following' | 'intentions' | `group:${string}`;

export function feedPosts(s: AppData, feed: FeedId): Post[] {
  const posts = visiblePosts(s).filter((p) => p.type !== 'reel');
  if (feed === 'intentions') return posts.filter((p) => p.type === 'request');
  if (feed === 'following') return posts.filter((p) => s.followingIds.includes(p.authorId) || p.authorId === s.user?.id);
  if (feed.startsWith('group:')) return posts.filter((p) => p.groupId === feed.slice(6));
  return posts;
}

export const tiktokReelId = (videoId: string) => `tt-${videoId}`;

/**
 * Reels made from other records are kept, one per record, so that a selector
 * returns the same objects each time and a subscribed screen does not re-render
 * without cause.
 */
const made = new WeakMap<object, Reel>();
function once<T extends object>(source: T, make: (source: T) => Reel): Reel {
  let reel = made.get(source);
  if (!reel) {
    reel = make(source);
    made.set(source, reel);
  }
  return reel;
}

/** A TikTok video as it appears in the feed. Its counts are those of Catalysis members, not TikTok's. */
export function tiktokReel(video: TikTokVideo): Reel {
  return {
    id: tiktokReelId(video.id),
    authorId: `tiktok:${video.handle}`,
    authorName: video.authorName || `@${video.handle}`,
    initial: (video.authorName || video.handle).charAt(0).toUpperCase(),
    title: video.caption,
    subtitle: '',
    category: video.topic,
    audio: 'TikTok',
    likeCount: 0,
    commentCount: 0,
    feed: 'forYou',
    tiktok: { videoId: video.id, url: video.url, handle: video.handle },
  };
}

/** Reels for a feed: approved TikTok videos, seeded reels and the user's own, minus anything reported or blocked. */
export function feedReels(s: AppData, feed: 'forYou' | 'following'): Reel[] {
  const own: Reel[] = s.posts
    .filter((p) => p.type === 'reel')
    .map((post) => once(post, (p) => ({
      id: p.id,
      authorId: p.authorId,
      authorName: p.authorName,
      initial: p.authorName.charAt(0).toUpperCase(),
      title: p.body ?? 'Untitled',
      subtitle: p.verse?.label ?? '',
      category: 'Reflection',
      audio: 'Original audio',
      media: p.media,
      likeCount: 0,
      commentCount: p.replyCount,
      feed: 'forYou',
    })));
  return [...own, ...(s.tiktok ?? []).map((video) => once(video, tiktokReel)), ...REELS]
    .filter((r) => !s.hiddenReelIds.includes(r.id) && !s.hiddenPostIds.includes(r.id) && !s.blockedUserIds.includes(r.authorId))
    .filter((r) => feed === 'forYou' || s.followingIds.includes(r.authorId) || r.authorId === s.user?.id);
}

export function prayedCount(s: AppData, post: Post): number {
  return post.prayedCount + (s.prayedPostIds.includes(post.id) ? 1 : 0);
}

export function goingCount(s: AppData, event: CalendarEvent): number {
  return event.goingCount + (s.others?.going[event.id] ?? 0) + (s.rsvpEventIds.includes(event.id) ? 1 : 0);
}

export function prayingCount(s: AppData, intention: { id: string; prayingCount: number }): number {
  return intention.prayingCount + (s.others?.praying[intention.id] ?? 0) + (s.prayingIntentionIds.includes(intention.id) ? 1 : 0);
}

/** The longest streak on record: what the logs show, or an earlier best carried with the account. */
export function bestStreak(s: AppData): number {
  return Math.max(s.user?.bestStreak ?? 0, longestStreak(s.prayerLogs));
}

export function allTimePrayers(s: AppData): number {
  return (s.user?.prayerCountOffset ?? 0) + s.prayerLogs.length;
}

export function commentsFor(s: AppData, postId: string): Comment[] {
  return s.comments
    .filter((c) => c.postId === postId && !s.blockedUserIds.includes(c.authorId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function highlightsFor(s: AppData, ref: ChapterRef): Highlight[] {
  return s.highlights.filter((h) => h.bookId === ref.bookId && h.chapter === ref.chapter);
}

export function journalFor(s: Pick<AppData, 'journal'>, filter: { kind?: JournalKind; query?: string } = {}): JournalEntry[] {
  const query = filter.query?.trim().toLowerCase();
  return (s.journal ?? []).filter(
    (e) =>
      (!filter.kind || e.kind === filter.kind) &&
      (!query || `${e.title ?? ''} ${e.body} ${e.scripture ?? ''}`.toLowerCase().includes(query)),
  );
}

/* ---------- people, followers and groups ---------- */

export function groupFor(s: Pick<AppData, 'groups'>, id: string | undefined): Group | undefined {
  return id ? (s.groups ?? GROUPS).find((g) => g.id === id) : undefined;
}

export function memberCount(s: Pick<AppData, 'joinedGroupIds'>, group: Group): number {
  return (group.memberCount ?? 0) + (s.joinedGroupIds.includes(group.id) ? 1 : 0);
}

/** Groups the member has joined, their own first. */
export function myGroups(s: AppData): Group[] {
  const mine = (s.groups ?? []).filter((g) => s.joinedGroupIds.includes(g.id));
  return [...mine.filter((g) => g.ownerId === s.user?.id), ...mine.filter((g) => g.ownerId !== s.user?.id)];
}

/** Groups not yet joined, the largest first. */
export function groupsToJoin(s: AppData): Group[] {
  return (s.groups ?? [])
    .filter((g) => !s.joinedGroupIds.includes(g.id))
    .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0) || a.name.localeCompare(b.name));
}

/**
 * A member as others see them. Someone outside the directory (it holds a limited
 * number of members) is made up from what a post says of its author.
 */
export function personFor(s: AppData, id: string): Person | undefined {
  if (s.user?.id === id) {
    const { user } = s;
    return {
      id, name: user.name, handle: user.handle, parish: user.parish, portraitUrl: user.portraitUrl, quote: user.quote,
      followerCount: s.followerIds.length, followingCount: s.followingIds.length,
    };
  }
  const known = (s.people ?? []).find((p) => p.id === id);
  if (known) return known;
  const name = s.posts.find((p) => p.authorId === id)?.authorName ?? s.comments.find((c) => c.authorId === id)?.authorName;
  if (!name) return undefined;
  // Kept, so that the same member is the same object each time a screen asks.
  const key = `${id}\n${name}`;
  let person = strangers.get(key);
  if (!person) {
    person = { id, name, handle: '', parish: '' };
    strangers.set(key, person);
  }
  return person;
}

const strangers = new Map<string, Person>();

export function followerCount(s: AppData, person: Person): number {
  if (s.user?.id === person.id) return s.followerIds.length;
  return (person.followerCount ?? 0) + (s.followingIds.includes(person.id) ? 1 : 0);
}

const known = (s: AppData, ids: string[]): Person[] =>
  ids.filter((id) => !s.blockedUserIds.includes(id)).flatMap((id) => personFor(s, id) ?? []);

export const followersOf = (s: AppData): Person[] => known(s, s.followerIds ?? []);
export const followingOf = (s: AppData): Person[] => known(s, s.followingIds);

/** Members to suggest: not already followed, not blocked, the most followed first. */
export function peopleToFollow(s: AppData): Person[] {
  return (s.people ?? [])
    .filter((p) => p.id !== s.user?.id && !s.followingIds.includes(p.id) && !s.blockedUserIds.includes(p.id))
    .sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0) || a.name.localeCompare(b.name));
}

/** A member's posts, newest first, as far as the feed on this device reaches. */
export function postsBy(s: AppData, authorId: string): Post[] {
  return visiblePosts(s).filter((p) => p.authorId === authorId);
}

/**
 * Milestones, worked out from what the member has actually done. The demo
 * account keeps the ones written for it.
 */
export function milestonesFor(s: AppData): Milestone[] {
  if (!s.user) return [];
  if (s.user.id === DEMO_USER.id) return s.user.milestones;
  const best = bestStreak(s);
  const step = (id: string, title: string, current: number, total: number): Milestone =>
    current >= total ? { id, title, achieved: 'Done' } : { id, title, progress: { current, total } };
  return [
    step('m-first', 'A first prayer', Math.min(allTimePrayers(s), 1), 1),
    step('m-7', 'Seven days of prayer in a row', Math.min(best, 7), 7),
    step('m-30', 'Thirty days of prayer in a row', Math.min(best, 30), 30),
    step('m-100', 'One hundred prayers', Math.min(allTimePrayers(s), 100), 100),
    step('m-journal', 'Ten journal entries', Math.min((s.journal ?? []).length, 10), 10),
    step('m-pray', 'Prayed for ten intentions', Math.min(s.prayedPostIds.length + s.prayingIntentionIds.length, 10), 10),
  ];
}

export function notesFor(s: AppData, ref: ChapterRef): Note[] {
  return s.notes.filter((n) => n.bookId === ref.bookId && n.chapter === ref.chapter);
}

export function isBookmarked(s: AppData, ref: ChapterRef): boolean {
  return s.bookmarks.some((b) => sameRef(b, ref));
}

export function activeConversation(s: AppData): Conversation | undefined {
  return s.conversations.find((c) => c.id === s.activeConversationId);
}

/** Events are static for now; this is where a backend query would go. */
export function allEvents(): CalendarEvent[] {
  return EVENTS;
}
