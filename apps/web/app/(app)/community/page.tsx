'use client';

import {
  feedPosts, feedReels, groupFor, groupsToJoin, INTENTIONS, memberCount, myGroups, SPOTLIGHT_GROUP_ID,
  type FeedId, type Group, type Reel, type Tone,
} from '@catalysis/api';
import { Clapperboard, HandHeart, Plus, Search, Sparkles, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { ComposeBar, PostCard } from '@/components/community';
import { GroupHeader, GroupsSheet, groupTone, JoinButton } from '@/components/groups';
import { Page } from '@/components/shell';
import { Avatar, Card, CardTitle, cx, EmptyState, Ico, initials, Photo, Pill, Skeleton } from '@/components/ui';
import { useNow } from '@/lib/hooks';
import { useApp } from '@/lib/store';

const EMPTY: Record<string, string> = {
  forYou: 'Nothing here yet. Be the first to share a reflection.',
  following: 'Follow someone to see their reflections here.',
  intentions: 'No intentions just now. Share one and others will pray with you.',
};

/* ---------- feed switcher ---------- */

/** A pill in the scrolling row below the desktop breakpoint, a row in the side card from it. */
const SWITCH = 'gs flex shrink-0 items-center gap-2 rounded-full px-4 py-[10px] text-left text-[14px] font-semibold whitespace-nowrap lg:w-full lg:gap-[10px] lg:rounded-[14px] lg:px-[13px] lg:py-[11px] lg:text-[15px] lg:font-medium lg:whitespace-normal';
const SWITCH_ON = 'bg-btn text-btn-text';
const SWITCH_OFF = 'hover-inset bg-inset text-ink lg:bg-transparent';

function FeedRow({
  id, label, icon, count, feed, onPick,
}: { id: FeedId; label: string; icon: LucideIcon; count?: number; feed: FeedId; onPick: (id: FeedId) => void }) {
  const active = feed === id;
  return (
    <button type="button" aria-current={active ? 'true' : undefined} onClick={() => onPick(id)} className={cx(SWITCH, active ? SWITCH_ON : SWITCH_OFF)}>
      <Ico icon={icon} size={16} />
      {label}
      {count ? (
        <span aria-label={`${count} ${count === 1 ? 'request' : 'requests'}`} className="rounded-full bg-a1 px-2 py-[2px] text-[12px] font-bold text-on-a lg:ml-auto">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function GroupRow({
  id, name, tone, feed, onPick,
}: { id: string; name: string; tone: Tone; feed: FeedId; onPick: (id: FeedId) => void }) {
  const feedId: FeedId = `group:${id}`;
  const active = feed === feedId;
  return (
    <button
      type="button"
      aria-current={active ? 'true' : undefined}
      onClick={() => onPick(feedId)}
      className={cx(
        'gs flex shrink-0 items-center rounded-full px-4 py-[10px] text-left text-[14px] font-semibold whitespace-nowrap',
        'lg:w-full lg:gap-[11px] lg:rounded-[18px] lg:p-[6px] lg:whitespace-normal',
        active ? 'bg-btn text-btn-text lg:bg-inset lg:text-ink' : 'hover-inset bg-inset text-ink lg:bg-transparent lg:font-medium',
      )}
    >
      <Avatar name={name} tone={tone} size={36} shape="square" className="hidden lg:flex" />
      {name}
    </button>
  );
}

function Switcher({ feed, onPick, onGroups }: { feed: FeedId; onPick: (id: FeedId) => void; onGroups: (start: 'find' | 'create') => void }) {
  const requests = useApp((s) => feedPosts(s, 'intentions').length);
  const groups = useApp((s) => myGroups(s));
  // A group opened from a link or from search, not yet joined, still shows in the row.
  const visiting = useApp((s) => (feed.startsWith('group:') && !s.joinedGroupIds.includes(feed.slice(6)) ? groupFor(s, feed.slice(6)) : undefined));
  return (
    <nav
      aria-label="Feeds"
      className="no-scrollbar -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 md:-mx-7 md:px-7 lg:sticky lg:top-[84px] lg:mx-0 lg:h-[calc(100dvh-112px)] lg:min-h-[480px] lg:flex-col lg:gap-4 lg:self-start lg:px-0"
    >
      <div className="contents lg:block lg:rounded-[28px] lg:border lg:border-line lg:bg-card lg:p-[14px]">
        <div className="contents lg:flex lg:flex-col lg:gap-1">
          <FeedRow id="forYou" label="For you" icon={Sparkles} feed={feed} onPick={onPick} />
          <FeedRow id="following" label="Following" icon={Users} feed={feed} onPick={onPick} />
          <FeedRow id="intentions" label="Intentions" icon={HandHeart} count={requests} feed={feed} onPick={onPick} />
          <Link href="/reels" className={cx(SWITCH, SWITCH_OFF)}>
            <Ico icon={Clapperboard} size={16} />
            Reels
          </Link>
        </div>
      </div>
      <div className="no-scrollbar contents lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-[28px] lg:border lg:border-line lg:bg-card lg:p-5">
        <h2 className="mn hidden text-muted lg:block">Your groups</h2>
        {groups.length === 0 && !visiting ? (
          <EmptyState className="mt-[14px] hidden text-[14px] lg:block">You have not joined a group yet.</EmptyState>
        ) : (
          <div className="contents lg:mt-2 lg:-mx-[6px] lg:flex lg:flex-col">
            {[...(visiting ? [visiting] : []), ...groups].map((group) => (
              <GroupRow key={group.id} id={group.id} name={group.name} tone={groupTone(group.id)} feed={feed} onPick={onPick} />
            ))}
          </div>
        )}
        <div className="contents lg:mt-4 lg:flex lg:flex-col lg:gap-2">
          <button type="button" onClick={() => onGroups('create')} className={cx(SWITCH, 'hover-dim border border-dashed border-ink/40 text-ink lg:justify-center lg:rounded-full lg:font-semibold')}>
            <Ico icon={Plus} size={16} />
            Start a group
          </button>
          <button type="button" onClick={() => onGroups('find')} className={cx(SWITCH, SWITCH_OFF, 'lg:justify-center lg:rounded-full lg:bg-inset lg:font-semibold')}>
            <Ico icon={Search} size={16} />
            Find groups
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ---------- stories ---------- */

/** Reels opened from the stories row, kept for the session so the rings stay read after coming back. */
const openedThisSession = new Set<string>();

function storyHandle(reel: Reel, handle?: string): string {
  if (reel.tiktok) return reel.tiktok.handle;
  if (handle) return handle.replace(/^@/, '');
  return (reel.authorName.split(' ')[0] ?? reel.authorName).toLowerCase();
}

function Story({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      {children}
      <span className="gs mt-[6px] block max-w-[74px] truncate text-[12px] font-medium text-ink">{label}</span>
    </>
  );
}

function Stories() {
  const reels = useApp((s) => feedReels(s, 'forYou')).slice(0, 8);
  const handles = useApp((s) => Object.fromEntries(s.people.map((p) => [p.id, p.handle])));
  const [opened, setOpened] = useState<string[]>(() => [...openedThisSession]);

  const open = (id: string) => {
    openedThisSession.add(id);
    setOpened((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  return (
    <section aria-label="Reels" className="no-scrollbar -mx-4 overflow-x-auto px-4 md:-mx-7 md:px-7 lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-[14px]">
        <li className="shrink-0 text-center">
          <Link href="/create?mode=reel" className="hover-dim block">
            <Story label="Your reel">
              <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-2 border-dashed border-ink text-ink">
                <Ico icon={Plus} size={22} />
              </span>
            </Story>
          </Link>
        </li>
        {reels.map((reel) => {
          const seen = opened.includes(reel.id);
          return (
            <li key={reel.id} className="shrink-0 text-center">
              <Link
                href={`/reels?reel=${reel.id}`}
                aria-label={`${reel.title} by ${reel.authorName}${seen ? ', opened' : ''}`}
                onClick={() => open(reel.id)}
                className="hover-dim block"
              >
                <Story label={storyHandle(reel, handles[reel.authorId])}>
                  <span className={cx('block h-[66px] w-[66px] rounded-full p-[3px]', seen ? 'bg-line' : 'bg-a1')}>
                    {reel.media ? (
                      <Photo media={reel.media} className="h-full w-full rounded-full border-[3px] border-bg" />
                    ) : (
                      <span className="bq flex h-full w-full items-center justify-center rounded-full border-[3px] border-bg bg-a4 text-[20px] font-bold text-on-a">
                        {initials(reel.authorName)}
                      </span>
                    )}
                  </span>
                </Story>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- feed ---------- */

function Feed({ feed }: { feed: FeedId }) {
  const now = useNow();
  const posts = useApp((s) => feedPosts(s, feed));
  if (posts.length === 0) {
    return (
      <Card className="px-6 py-[22px]">
        <EmptyState>{EMPTY[feed] ?? 'Nothing has been shared in this group yet.'}</EmptyState>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-[14px]">
      {posts.map((post) => <PostCard key={post.id} post={post} now={now} />)}
    </div>
  );
}

/* ---------- right column ---------- */

function Intentions() {
  const praying = useApp((s) => s.prayingIntentionIds);
  const toggleIntention = useApp((s) => s.toggleIntention);
  return (
    <Card as="section" aria-label="Intentions this week" className="p-[22px]">
      <CardTitle className="text-[22px]">Intentions this week</CardTitle>
      <ul className="gs mt-[14px] flex flex-col gap-[10px]">
        {INTENTIONS.map((intention) => {
          const on = praying.includes(intention.id);
          return (
            <li key={intention.id} className="rounded-[16px] bg-inset p-[14px]">
              <div className="text-[15px] leading-[1.4] text-ink">{intention.title}</div>
              <div className="mt-[10px] flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">{intention.prayingCount + (on ? 1 : 0)} praying{on ? ' · with you' : ''}</span>
                <Pill
                  variant={on ? 'highlight' : 'ghost'}
                  aria-pressed={on}
                  aria-label={`${on ? 'Prayed' : 'Pray'}: ${intention.title}`}
                  onClick={() => toggleIntention(intention.id)}
                  className="relative px-3 py-[6px] text-[13px] after:absolute after:-inset-[6px]"
                >
                  {on ? 'Prayed' : 'Pray'}
                </Pill>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Spotlight({ onOpen }: { onOpen: (group: Group) => void }) {
  // The design's group while it is there to join; otherwise the largest group not yet joined.
  const group = useApp((s) => {
    const open = groupsToJoin(s);
    return open.find((g) => g.id === SPOTLIGHT_GROUP_ID) ?? open[0] ?? groupFor(s, SPOTLIGHT_GROUP_ID) ?? myGroups(s)[0];
  });
  const count = useApp((s) => (group ? memberCount(s, group) : 0));
  if (!group) return null;
  return (
    <Card as="section" surface="solid" aria-label="Group spotlight" className="flex min-h-[240px] flex-col justify-between gap-6 p-6 lg:flex-1">
      <span className="mn text-a2">Group spotlight</span>
      <div>
        <h2 className="bq text-[30px] leading-none font-bold tracking-[-.04em] text-white">
          <button type="button" onClick={() => onOpen(group)} className="hover-dim text-left">{group.name}</button>
        </h2>
        {group.description ? <p className="gs mt-2 text-[14px] text-on-solid-muted">{group.description}</p> : null}
        {count > 0 ? <p className="gs mt-2 text-[13px] text-on-solid-muted">{count} {count === 1 ? 'member' : 'members'}</p> : null}
      </div>
      <JoinButton group={group} onSolid size="large" />
    </Card>
  );
}

function Community() {
  const router = useRouter();
  const asked = useSearchParams().get('group');
  const [picked, setPicked] = useState<FeedId | null>(null);
  const [sheet, setSheet] = useState<'find' | 'create' | null>(null);
  const feed: FeedId = picked ?? (asked ? `group:${asked}` : 'forYou');
  const group = useApp((s) => (feed.startsWith('group:') ? groupFor(s, feed.slice(6)) : undefined));

  const pick = (id: FeedId) => {
    setPicked(id);
    if (asked) router.replace('/community');
  };
  const openGroup = (g: Group) => pick(`group:${g.id}`);

  return (
    <Page>
      <h1 className="sr-only">Community</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_1fr_330px]">
        <Switcher feed={feed} onPick={pick} onGroups={setSheet} />
        <div className="flex min-w-0 flex-col gap-[14px]">
          {group ? <GroupHeader group={group} onClosed={() => pick('forYou')} /> : <Stories />}
          <ComposeBar groupId={group?.id} />
          <section aria-label="Feed">
            <Feed feed={feed} />
          </section>
        </div>
        <aside
          aria-label="Intentions and groups"
          className="no-scrollbar flex min-w-0 flex-col gap-4 lg:sticky lg:top-[84px] lg:h-[calc(100dvh-112px)] lg:min-h-[480px] lg:self-start lg:overflow-y-auto"
        >
          <Intentions />
          <Spotlight onOpen={openGroup} />
        </aside>
      </div>
      <GroupsSheet key={sheet ?? 'closed'} open={sheet !== null} start={sheet ?? 'find'} onClose={() => setSheet(null)} onOpen={openGroup} />
    </Page>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<Page><Skeleton className="h-[420px] rounded-[28px]" /></Page>}>
      <Community />
    </Suspense>
  );
}
