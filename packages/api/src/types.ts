/** Calendar date in local time, `YYYY-MM-DD`. */
export type ISODate = string;
/** Instant, ISO-8601 with time. */
export type ISODateTime = string;

/** Bundled images, resolved to a real asset by each app. */
export type AssetKey = 'angel' | 'stJoseph' | 'rosary' | 'monstrance';

/** Accent a piece of content is tinted with; each app maps it to its own palette. */
export type Tone = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6';

export interface Media {
  kind: 'image' | 'video';
  /** Bundled asset (also used as the poster for a video). */
  asset?: AssetKey;
  /** Remote URL: uploaded photo, or HLS/MP4 stream for a reel. */
  url?: string;
  /** CSS-style focal point, e.g. `50% 20%`. */
  focus?: string;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  email: string;
  parish: string;
  portraitUrl?: string;
  quote?: { text: string; attribution: string };
  /** Moderators decide which TikTok videos appear in Reels. */
  role?: 'member' | 'moderator';
  booksRead: number;
  /** Longest streak reached before this device started keeping logs. */
  bestStreak?: number;
  /** Prayers logged before this device started keeping logs. */
  prayerCountOffset: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  /** Short date label once achieved, e.g. `Aug 26`. */
  achieved?: string;
  progress?: { current: number; total: number };
}

export interface Prayer {
  id: string;
  title: string;
  /** Shorter title for tight rows. */
  shortTitle?: string;
  /** `HH:mm`, 24-hour local time. */
  scheduledTime: string;
  guidedContentId?: string;
}

export interface PrayerLog {
  prayerId: string;
  date: ISODate;
  completedAt: ISODateTime;
}

export interface GuidedStep {
  title: string;
  /** What to do at this step. */
  body: string;
  /** The words prayed at this step, one paragraph per line break. */
  prayer?: string;
  /** A passage to read at this step, e.g. `Luke 1:26-38`. */
  scripture?: string;
  /** A question to carry into the journal afterwards. */
  prompt?: string;
}

export interface GuidedPrayer {
  id: string;
  title: string;
  minutes: number;
  /** One line under the title in the prayer book. */
  summary?: string;
  /** Steps shown one at a time in the guided player. */
  steps: GuidedStep[];
}

export type JournalKind = 'free' | 'gratitude' | 'petition' | 'examen' | 'lectio';

/** A private entry in the prayer journal. Only its writer can read it. */
export interface JournalEntry {
  id: string;
  /** The day the entry belongs to, in the writer's own calendar. */
  date: ISODate;
  kind: JournalKind;
  title?: string;
  body: string;
  /** The prayer-book prayer this entry followed. */
  prayerId?: string;
  /** A passage the entry is about, e.g. `John 15:5`. */
  scripture?: string;
  /** For a petition: the day it was marked answered. */
  answeredOn?: ISODate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Highlight {
  id: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  /** When set, only this phrase inside the verse is highlighted. */
  text?: string;
  /** Highlighter colour; the default is `a2`. */
  color?: Tone;
  createdAt: ISODateTime;
}

export interface Note {
  id: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  createdAt: ISODateTime;
}

export type PostType = 'reflection' | 'request' | 'photo' | 'reel';
export type Audience = 'everyone' | 'parish' | 'followers';

export interface VerseRef {
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  /** Display reference, e.g. `John 1:5`. */
  label: string;
}

export interface Post {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  groupId?: string;
  body?: string;
  /** Bodoni italic pull quote shown above the body. */
  pullQuote?: string;
  media?: Media;
  verse?: VerseRef;
  audience: Audience;
  createdAt: ISODateTime;
  /** Counts from everyone else; this user's own reaction is added on top. */
  prayedCount: number;
  replyCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: ISODateTime;
}

export interface Reel {
  id: string;
  authorId: string;
  authorName: string;
  /** Letter shown in the creator square. */
  initial: string;
  title: string;
  subtitle: string;
  category: string;
  audio: string;
  media?: Media;
  likeCount: number;
  commentCount: number;
  feed: 'forYou' | 'following';
  /** Set for a video that lives on TikTok and is shown through TikTok's own player. */
  tiktok?: { videoId: string; url: string; handle: string };
}

/** A TikTok video approved for the Reels feed. The video itself stays on TikTok. */
export interface TikTokVideo {
  /** TikTok's id for the video. */
  id: string;
  /** The video's page on TikTok. */
  url: string;
  /** Creator's handle, without the `@`. */
  handle: string;
  authorName: string;
  caption: string;
  topic: string;
  approvedAt: ISODateTime;
}

export interface DiscoverTile {
  id: string;
  kind: 'reel' | 'photo';
  reelId?: string;
  title?: string;
  meta?: string;
  media?: Media;
  /** Tile height in the 2-column masonry, px at 390 wide. */
  height: number;
  /** Icon colour: photos on light images use ink. */
  iconTone?: 'light' | 'dark';
}

export interface Person {
  id: string;
  name: string;
  handle: string;
  parish: string;
  portraitUrl?: string;
  quote?: { text: string; attribution: string };
  /** Followers other than the member looking; their own follow is added on top. */
  followerCount?: number;
  followingCount?: number;
}

export interface Group {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  /** The member who started the group. Groups that came with the app have none. */
  ownerId?: string;
  /** Members other than the member looking; their own membership is added on top. */
  memberCount?: number;
}

export interface Intention {
  id: string;
  title: string;
  prayingCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** Short tag for calendar cells. */
  shortTitle?: string;
  date: ISODate;
  /** `HH:mm`, 24-hour local time. */
  time: string;
  location: string;
  groupId?: string;
  /** People going, excluding this user. */
  goingCount: number;
  /** Small caps note for list rows, e.g. the day's patron. */
  note?: string;
  /** Colour of the event's tag on the calendar. */
  tone?: Tone;
}

export type LiturgicalRank =
  | 'solemnity'
  | 'feast'
  | 'memorial'
  | 'optional'
  | 'sunday'
  | 'weekday';

export type LiturgicalSeason = 'Advent' | 'Christmas' | 'Lent' | 'Triduum' | 'Easter' | 'Ordinary Time';

export interface LiturgicalDay {
  date: ISODate;
  /** Full title, e.g. `Feast of Sts. Michael, Gabriel & Raphael`. */
  celebration: string;
  /** Compact name for calendar cells and the mobile sub-bar. */
  shortName: string;
  rank: LiturgicalRank;
  season: LiturgicalSeason;
}

export type SourceType = 'Scripture' | 'Catechism' | 'Council' | 'Saint';

export interface Citation {
  type: SourceType;
  reference: string;
  description: string;
}

export type MessageBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string; citation?: string };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  /** Raw text. For the assistant this is Lumen markup, see `parseLumenBlocks`. */
  content: string;
  citations: Citation[];
  followUps: string[];
  createdAt: ISODateTime;
  /** True when the answer came from the offline demo script, not the model. */
  demo?: boolean;
  saved?: boolean;
  /** The reader's thumbs up or down on an answer. */
  feedback?: 'up' | 'down';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: ISODateTime;
}
