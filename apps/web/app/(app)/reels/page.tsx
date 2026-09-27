'use client';

import { Plus, Search, ShieldCheck, Sparkles, Users, Video, type LucideIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { DISCOVER_TABS, DiscoverGrid, ReelFeedView, type DiscoverTab, type ReelFeed } from '@/components/reels';
import { Page } from '@/components/shell';
import { AddTikTok, useCanAddTikTok } from '@/components/tiktok';
import { useApp } from '@/lib/store';
import { Card, CardTitle, CircleButton, cx, Ico, PageTitle, Pill, Segmented, Skeleton, type SegmentItem } from '@/components/ui';

const FEEDS: SegmentItem<ReelFeed>[] = [
  { id: 'following', label: 'Following' },
  { id: 'forYou', label: 'For you' },
];

const FEED_ROWS: { id: ReelFeed; label: string; icon: LucideIcon }[] = [
  { id: 'forYou', label: 'For you', icon: Sparkles },
  { id: 'following', label: 'Following', icon: Users },
];

function Reels() {
  const startAt = useSearchParams().get('reel');
  const [feed, setFeed] = useState<ReelFeed>('forYou');
  const [tab, setTab] = useState<DiscoverTab>('reels');
  const [adding, setAdding] = useState(false);
  const canAdd = useCanAddTikTok();
  const moderator = useApp((s) => s.user?.role === 'moderator');

  return (
    <Page>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[240px_1fr_360px] lg:gap-4">
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <h1 className="sr-only">Reels</h1>
          <Segmented label="Feeds" items={FEEDS} value={feed} onChange={setFeed} />
          <div className="flex items-center gap-2">
            {canAdd ? <CircleButton icon={Video} label="Add from TikTok" onClick={() => setAdding(true)} /> : null}
            <CircleButton icon={Search} label="Discover" href="/discover" />
          </div>
        </div>

        <aside aria-label="Feeds" className="hidden flex-col lg:flex">
          <PageTitle>Reels</PageTitle>
          <p className="gs mt-3 text-[15px] leading-[1.5] text-muted">Short films of faith: testimonies and reflections.</p>
          <Card className="mt-6 p-[14px]">
            <div className="gs flex flex-col gap-1 text-[15px] font-medium">
              {FEED_ROWS.map((row) => {
                const active = feed === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setFeed(row.id)}
                    className={cx('flex items-center gap-[10px] rounded-[14px] px-[13px] py-[11px] text-left', active ? 'bg-btn text-btn-text' : 'hover-inset text-ink')}
                  >
                    <Ico icon={row.icon} size={16} />
                    {row.label}
                  </button>
                );
              })}
            </div>
          </Card>
          <Pill href="/create" icon={Plus} className="mt-4 p-[14px] text-[15px]">New post</Pill>
          {canAdd ? <Pill variant="ghost" icon={Video} onClick={() => setAdding(true)} className="mt-[10px] p-[14px] text-[15px]">Add from TikTok</Pill> : null}
          {moderator ? <Pill href="/reels/review" variant="ghost" icon={ShieldCheck} className="mt-[10px] p-[14px] text-[15px]">Review videos</Pill> : null}
        </aside>

        <section
          aria-label="Reels"
          className="mx-auto h-[calc(100dvh-190px)] min-h-[420px] w-full overflow-hidden rounded-[28px] bg-black lg:h-[calc(100dvh-140px)] lg:min-h-[560px] lg:max-w-[420px]"
        >
          <ReelFeedView key={feed} feed={feed} startAt={startAt} />
        </section>

        <Card as="aside" aria-label="Discover" className="no-scrollbar hidden overflow-y-auto p-[22px] lg:block lg:h-[calc(100dvh-140px)] lg:min-h-[560px]">
          <CardTitle>Discover</CardTitle>
          <Segmented label="Discover" items={DISCOVER_TABS} value={tab} onChange={setTab} stretch className="mt-4 mb-4" />
          <DiscoverGrid tab={tab} scale={0.92} />
        </Card>
      </div>
      <AddTikTok open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}

function Loading() {
  return (
    <Page>
      <Skeleton className="mx-auto h-[calc(100dvh-190px)] min-h-[420px] w-full rounded-[28px] lg:h-[calc(100dvh-140px)] lg:max-w-[420px]" />
    </Page>
  );
}

export default function ReelsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Reels />
    </Suspense>
  );
}
