'use client';

import type { TikTokVideo } from '@catalysis/api';
import { Check, Play, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { BackLink, Page } from '@/components/shell';
import { AddTikTokForm, OnTikTok, TikTokPlayer } from '@/components/tiktok';
import { Card, CardTitle, Chip, EmptyState, Field, Ico, PageTitle, Pill, Skeleton, TextAction } from '@/components/ui';
import { useApp } from '@/lib/store';
import { fetchTikTok, reviewTikTok, setTrustedCreator, TOPICS, type ReviewList, type TikTokLists } from '@/lib/tiktok';

type Apply = (change: Promise<{ ok: true; lists: TikTokLists } | { ok: false; message: string }>) => Promise<void>;

/** A video with its player, which loads only when asked for. */
function VideoRow({ video, note, children }: { video: TikTokVideo; note?: ReactNode; children: ReactNode }) {
  const [watching, setWatching] = useState(false);
  return (
    <li className="flex flex-col gap-4 rounded-[22px] bg-inset p-4 sm:flex-row">
      <div className="relative h-[300px] w-full shrink-0 overflow-hidden rounded-[16px] bg-black sm:h-[280px] sm:w-[158px]">
        {watching ? (
          <TikTokPlayer videoId={video.id} title={`${video.caption} — ${video.authorName}`} controls />
        ) : (
          <button type="button" onClick={() => setWatching(true)} aria-label={`Watch: ${video.caption}`} className="hover-dim flex h-full w-full flex-col items-center justify-center gap-3 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><Ico icon={Play} size={20} fill="currentColor" /></span>
            <span className="gs text-[13px] font-semibold">Watch</span>
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="a2">{video.topic}</Chip>
          <span className="gs text-[14px] font-semibold text-ink">{video.authorName}</span>
          <OnTikTok url={video.url} handle={video.handle} className="text-muted" />
        </div>
        <p className="gs mt-3 line-clamp-5 text-[15px] leading-[1.5] text-ink">{video.caption}</p>
        {note ? <p className="gs mt-3 text-[13px] leading-[1.45] text-muted">{note}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">{children}</div>
      </div>
    </li>
  );
}

function Pending({ list, apply, busy }: { list: ReviewList['pending']; apply: Apply; busy: boolean }) {
  const [topics, setTopics] = useState<Record<string, string>>({});
  return (
    <Card as="section" aria-labelledby="pending-heading" className="p-[22px] md:p-[26px]">
      <div className="flex items-baseline justify-between gap-3">
        <CardTitle><span id="pending-heading">Waiting for review</span></CardTitle>
        <span className="gs text-[15px] font-bold text-ink">{list.length}</span>
      </div>
      <p className="gs mt-2 text-[14px] leading-[1.5] text-muted">
        Watch each video before approving it: a caption can say one thing and the video another.
      </p>
      {list.length === 0 ? (
        <EmptyState className="mt-5">Nothing is waiting.</EmptyState>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {list.map((video) => (
            <VideoRow key={video.id} video={video} note={video.screening}>
              <label className="gs flex items-center gap-2 text-[13px] text-muted">
                Topic
                <select
                  value={topics[video.id] ?? video.topic}
                  onChange={(e) => setTopics((t) => ({ ...t, [video.id]: e.target.value }))}
                  className="rounded-full border border-line bg-card px-3 py-2 text-[13px] font-semibold text-ink"
                >
                  {TOPICS.map((topic) => <option key={topic}>{topic}</option>)}
                </select>
              </label>
              <Pill icon={Check} disabled={busy} onClick={() => apply(reviewTikTok(video.id, 'approve', topics[video.id]))} className="px-[18px] py-[10px] text-[14px]">Approve</Pill>
              <Pill variant="ghost" icon={X} disabled={busy} onClick={() => apply(reviewTikTok(video.id, 'reject'))} className="px-[18px] py-[10px] text-[14px]">Decline</Pill>
            </VideoRow>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Creators({ list, apply, busy }: { list: ReviewList['creators']; apply: Apply; busy: boolean }) {
  const [handle, setHandle] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!handle.trim()) return;
    void apply(setTrustedCreator(handle, true)).then(() => setHandle(''));
  };
  return (
    <Card as="section" aria-labelledby="creators-heading" className="p-[22px] md:p-[26px]">
      <CardTitle><span id="creators-heading">Trusted creators</span></CardTitle>
      <p className="gs mt-2 text-[14px] leading-[1.5] text-muted">
        Their videos go into Reels without waiting, as long as the caption reads as Christian or Catholic.
      </p>
      <ul className="gs mt-4 flex flex-col gap-2">
        {list.map((creator) => (
          <li key={creator.handle} className="flex items-center gap-3 rounded-[14px] bg-inset px-[14px] py-[10px]">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-ink">{creator.name}</span>
              <span className="block truncate text-[12px] text-muted">@{creator.handle}</span>
            </span>
            <TextAction disabled={busy} onClick={() => apply(setTrustedCreator(creator.handle, false))} aria-label={`Remove ${creator.name}`} className="text-subtle">
              Remove
            </TextAction>
          </li>
        ))}
      </ul>
      {list.length === 0 ? <EmptyState className="mt-1 text-[14px]">No one yet.</EmptyState> : null}
      <form onSubmit={submit} className="mt-4">
        <Field id="creator-handle" label="Add a creator" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@name" autoComplete="off" />
        <Pill type="submit" variant="ghost" disabled={busy || !handle.trim()} className="mt-3 w-full p-3 text-[14px]">Trust this creator</Pill>
      </form>
    </Card>
  );
}

export default function ReviewPage() {
  const moderator = useApp((s) => s.user?.role === 'moderator');
  const setTikTok = useApp((s) => s.setTikTok);
  const [lists, setLists] = useState<TikTokLists | null>(null);
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);

  const take = useCallback((next: TikTokLists) => {
    setLists(next);
    setTikTok(next.videos);
  }, [setTikTok]);

  const load = useCallback(async () => {
    const next = await fetchTikTok();
    if (next) take(next);
    else setFailed('The review list could not be loaded. Check your connection and reload.');
  }, [take]);

  useEffect(() => {
    if (!moderator) return;
    let live = true;
    void fetchTikTok().then((next) => {
      if (!live) return;
      if (next) take(next);
      else setFailed('The review list could not be loaded. Check your connection and reload.');
    });
    return () => {
      live = false;
    };
  }, [moderator, take]);

  const apply: Apply = async (change) => {
    setBusy(true);
    setFailed('');
    const result = await change;
    setBusy(false);
    if (result.ok) take(result.lists);
    else setFailed(result.message);
  };

  if (!moderator) {
    return (
      <Page>
        <BackLink href="/reels">Reels</BackLink>
        <PageTitle>Review</PageTitle>
        <EmptyState className="mt-4 max-w-[520px]">Only moderators can review videos. If you look after this community, ask for the moderator role.</EmptyState>
      </Page>
    );
  }

  const review = lists?.review;
  return (
    <Page>
      <BackLink href="/reels">Reels</BackLink>
      <PageTitle accent="what appears in Reels" className="mb-[22px]">Review</PageTitle>
      {failed ? <p role="alert" className="gs mb-4 rounded-[16px] bg-a6 px-4 py-3 text-[14px] font-medium text-on-a">{failed}</p> : null}

      {!review ? (
        failed ? null : <Skeleton className="h-64 rounded-[28px]" />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <Pending list={review.pending} apply={apply} busy={busy} />

            {review.reported.length > 0 ? (
              <Card as="section" aria-labelledby="reported-heading" className="p-[22px] md:p-[26px]">
                <CardTitle><span id="reported-heading">Reported by members</span></CardTitle>
                <ul className="mt-5 flex flex-col gap-3">
                  {review.reported.map((video) => (
                    <VideoRow key={video.id} video={video} note={`${video.reports} ${video.reports === 1 ? 'member has' : 'members have'} reported this video.`}>
                      <Pill variant="accent" disabled={busy} onClick={() => apply(reviewTikTok(video.id, 'remove'))} className="px-[18px] py-[10px] text-[14px]">Remove from Reels</Pill>
                    </VideoRow>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card as="section" aria-labelledby="approved-heading" className="p-[22px] md:p-[26px]">
              <div className="flex items-baseline justify-between gap-3">
                <CardTitle><span id="approved-heading">In Reels</span></CardTitle>
                <span className="gs text-[15px] font-bold text-ink">{lists.videos.length}</span>
              </div>
              {lists.videos.length === 0 ? (
                <EmptyState className="mt-5">No TikTok videos are in Reels yet.</EmptyState>
              ) : (
                <ul className="mt-5 flex flex-col gap-3">
                  {lists.videos.map((video) => (
                    <VideoRow key={video.id} video={video}>
                      <Pill variant="ghost" disabled={busy} onClick={() => apply(reviewTikTok(video.id, 'remove'))} className="px-[18px] py-[10px] text-[14px]">Remove from Reels</Pill>
                    </VideoRow>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <Card as="section" aria-labelledby="add-heading" className="p-[22px] md:p-[26px]">
              <CardTitle><span id="add-heading">Add a video</span></CardTitle>
              <p className="gs mt-2 mb-4 text-[14px] leading-[1.5] text-muted">As a moderator, a video you add goes straight into Reels if its caption reads as Christian or Catholic.</p>
              <AddTikTokForm onAdded={() => void load()} />
            </Card>
            <Creators list={review.creators} apply={apply} busy={busy} />
          </div>
        </div>
      )}
    </Page>
  );
}
