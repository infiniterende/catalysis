'use client';

import {
  compactCount, DISCOVER_COLUMNS, feedReels, followingOf, peopleToFollow, type DiscoverTile, type Reel,
} from '@catalysis/api';
import {
  Ban, Bookmark, ExternalLink, Flag, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Music2, Play, Send, Trash2, Volume2, VolumeX,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDismiss } from '@/lib/hooks';
import { useMediaUrl } from '@/lib/media';
import { useApp } from '@/lib/store';
import { Avatar, Chip, cx, EmptyState, Ico, Photo, Pill, Sheet, SheetAction, toneFor, type SegmentItem } from './ui';
import { PeopleList, PersonLink, usePortrait } from './people';
import { OnTikTok, TikTokPlayer, type PlayerHandle, type PlayerState } from './tiktok';

export type ReelFeed = 'forYou' | 'following';

/* ---------- one reel ---------- */

function RailButton({
  icon, label, caption, fill, iconClass, pressed, onClick,
}: { icon: LucideIcon; label: string; caption?: string; fill?: string; iconClass?: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} className="hover-dim flex flex-col items-center text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
        <Ico icon={icon} size={21} fill={fill} className={iconClass} />
      </span>
      {caption ? <span className="gs mt-1 block text-[11px] leading-none font-semibold text-white">{caption}</span> : null}
    </button>
  );
}

function ReelView({ reel, active }: { reel: Reel; active: boolean }) {
  const liked = useApp((s) => s.likedReelIds.includes(reel.id));
  const saved = useApp((s) => s.savedReelIds.includes(reel.id));
  const following = useApp((s) => s.followingIds.includes(reel.authorId));
  const mine = useApp((s) => s.user?.id === reel.authorId);
  const toggleLike = useApp((s) => s.toggleLike);
  const toggleSave = useApp((s) => s.toggleSave);
  const toggleFollow = useApp((s) => s.toggleFollow);
  const reportReel = useApp((s) => s.reportReel);
  const reportPost = useApp((s) => s.reportPost);
  const blockUser = useApp((s) => s.blockUser);
  const portrait = usePortrait(reel.authorId);

  const url = useMediaUrl(reel.media);
  const isVideo = reel.media?.kind === 'video' && Boolean(url);
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(0);
  const [flash, setFlash] = useState<'muted' | 'sound' | null>(null);
  const [menu, setMenu] = useState<'options' | 'reported' | 'comments' | null>(null);
  const lastTap = useRef(0);
  const single = useRef<number | undefined>(undefined);

  // Only the reel on screen plays.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active) void el.play().catch(() => undefined);
    else el.pause();
  }, [active, url]);

  const like = () => {
    if (!liked) toggleLike(reel.id);
    setBurst((n) => n + 1);
  };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      window.clearTimeout(single.current);
      lastTap.current = 0;
      like();
      return;
    }
    lastTap.current = now;
    single.current = window.setTimeout(() => {
      if (!isVideo) return;
      setMuted((m) => {
        setFlash(m ? 'sound' : 'muted');
        window.setTimeout(() => setFlash(null), 700);
        return !m;
      });
    }, 290);
  };

  const share = async () => {
    const text = `${reel.title} — ${reel.authorName} on Catalysis`;
    try {
      if (navigator.share) await navigator.share({ text, url: `${window.location.origin}/reels?reel=${reel.id}` });
      else await navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${reel.id}`);
    } catch {
      // dismissed
    }
  };

  const hide = () => {
    reportReel(reel.id);
    reportPost(reel.id);
    setMenu(null);
  };

  return (
    <section
      data-reel={reel.id}
      aria-label={`${reel.title} by ${reel.authorName}`}
      className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black text-white"
      style={url ? undefined : { backgroundImage: 'radial-gradient(ellipse 70% 60% at 58% 38%, #5b5a63 0%, #2a2a31 50%, #121214 100%)' }}
    >
      {url && isVideo ? (
        <video ref={video} src={url} muted={muted} loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      ) : url ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `url('${url}') ${reel.media?.focus ?? '50% 50%'} / cover no-repeat` }}
        />
      ) : null}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[340px]" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.85))' }} />

      <button
        type="button"
        aria-label={isVideo ? 'Tap to mute or unmute, double-tap to like' : 'Double-tap to like'}
        onClick={onTap}
        className="absolute inset-0 cursor-default"
      />

      {burst > 0 ? (
        <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-a1" style={{ animation: 'heart-pop 700ms ease-out forwards' }}>
          <Ico icon={Heart} size={96} fill="currentColor" />
        </span>
      ) : null}
      {flash ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white">
            <Ico icon={flash === 'muted' ? VolumeX : Volume2} size={28} />
          </span>
        </span>
      ) : null}

      <div className="absolute right-[14px] bottom-7 flex flex-col items-center gap-4">
        <RailButton
          icon={Heart}
          label={liked ? 'Unlike' : 'Like'}
          pressed={liked}
          fill={liked ? 'currentColor' : undefined}
          iconClass={liked ? 'text-a1' : undefined}
          caption={compactCount(reel.likeCount + (liked ? 1 : 0))}
          onClick={() => toggleLike(reel.id)}
        />
        <RailButton icon={MessageCircle} label={`${reel.commentCount} comments`} caption={compactCount(reel.commentCount)} onClick={() => setMenu('comments')} />
        <RailButton
          icon={Bookmark}
          label={saved ? 'Remove from saved' : 'Save'}
          pressed={saved}
          fill={saved ? 'currentColor' : undefined}
          caption={saved ? 'Saved' : 'Save'}
          onClick={() => toggleSave(reel.id)}
        />
        <RailButton icon={Send} label="Share" caption="Share" onClick={share} />
        <RailButton icon={MoreHorizontal} label="More options" onClick={() => setMenu('options')} />
      </div>

      <div className="pointer-events-none absolute right-[76px] bottom-7 left-5">
        <div className="pointer-events-auto flex items-center gap-[10px]">
          <PersonLink id={reel.authorId} label={`${reel.authorName}’s profile`} className="flex min-w-0 items-center gap-[10px]">
            <Avatar name={reel.authorName} tone={toneFor(reel.authorId)} size={40} media={portrait} />
            <span className="gs min-w-0 truncate text-[15px] font-semibold text-white">{reel.authorName}</span>
          </PersonLink>
          {mine ? null : (
            <button
              type="button"
              aria-pressed={following}
              onClick={() => toggleFollow(reel.authorId)}
              className={cx(
                'gs hover-dim relative shrink-0 rounded-full border px-3 py-[6px] text-[13px] font-semibold after:absolute after:-inset-[6px]',
                following ? 'border-white bg-white text-[#0C0C0F]' : 'border-white/60 text-white',
              )}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        <h2 className="bq mt-3 text-[26px] leading-[1.1] font-bold tracking-[-.03em] text-white">{reel.title}</h2>
        {reel.subtitle ? <p className="gs mt-2 text-[14px] leading-[1.4] text-on-photo">{reel.subtitle}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-[10px]">
          <Chip tone="a2">{reel.category}</Chip>
          <span className="gs inline-flex items-center gap-[6px] text-[12px] text-on-photo">
            <Ico icon={Music2} size={13} />
            {reel.audio}
          </span>
        </div>
      </div>

      <Sheet open={menu === 'options'} onClose={() => setMenu(null)} title={reel.authorName}>
        {mine ? (
          <SheetAction danger icon={Trash2} onClick={hide}>Remove my reel</SheetAction>
        ) : (
          <>
            <SheetAction danger icon={Flag} onClick={() => setMenu('reported')}>Report reel</SheetAction>
            <SheetAction icon={Ban} onClick={() => { blockUser(reel.authorId); setMenu(null); }}>Block {reel.authorName}</SheetAction>
          </>
        )}
      </Sheet>
      <Sheet open={menu === 'reported'} onClose={hide} title="Reported">
        <p className="gs text-[16px] leading-[1.55] text-muted">Thank you. This reel has been hidden and sent for review.</p>
        <Pill onClick={hide} className="mt-5 w-full p-[14px] text-[15px]">Done</Pill>
      </Sheet>
      <Sheet open={menu === 'comments'} onClose={() => setMenu(null)} title={`${compactCount(reel.commentCount)} comments`}>
        <EmptyState>Comments on reels will open here once the community service is connected.</EmptyState>
      </Sheet>
    </section>
  );
}

/* ---------- a reel that lives on TikTok ---------- */

function TikTokReelView({ reel, active }: { reel: Reel; active: boolean }) {
  const tiktok = reel.tiktok as NonNullable<Reel['tiktok']>;
  const liked = useApp((s) => s.likedReelIds.includes(reel.id));
  const saved = useApp((s) => s.savedReelIds.includes(reel.id));
  const others = useApp((s) => s.others?.reelLikes[reel.id] ?? 0);
  const toggleLike = useApp((s) => s.toggleLike);
  const toggleSave = useApp((s) => s.toggleSave);
  const reportReel = useApp((s) => s.reportReel);

  const player = useRef<PlayerHandle>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(0);
  const [flash, setFlash] = useState<'muted' | 'sound' | null>(null);
  const [menu, setMenu] = useState<'options' | 'reported' | null>(null);
  const lastTap = useRef(0);
  const single = useRef<number | undefined>(undefined);

  const like = () => {
    if (!liked) toggleLike(reel.id);
    setBurst((n) => n + 1);
  };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      window.clearTimeout(single.current);
      lastTap.current = 0;
      like();
      return;
    }
    lastTap.current = now;
    single.current = window.setTimeout(() => {
      if (state !== 'playing') {
        player.current?.play();
        return;
      }
      const next = !muted;
      setMuted(next);
      player.current?.setMuted(next);
      setFlash(next ? 'muted' : 'sound');
      window.setTimeout(() => setFlash(null), 700);
    }, 290);
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: `${reel.title} — ${reel.authorName}`, url: tiktok.url });
      else await navigator.clipboard.writeText(tiktok.url);
    } catch {
      // dismissed
    }
  };

  const hide = () => {
    reportReel(reel.id);
    setMenu(null);
  };

  return (
    <section
      data-reel={reel.id}
      aria-label={`${reel.title} by ${reel.authorName}, on TikTok`}
      className="relative flex h-full w-full shrink-0 snap-start snap-always flex-col overflow-hidden bg-black text-white"
    >
      <div className="relative min-h-0 flex-1">
        {/* Only the reel on screen loads TikTok's player. */}
        {active && state !== 'unavailable' ? (
          <TikTokPlayer
            key={tiktok.videoId}
            ref={player}
            videoId={tiktok.videoId}
            title={`${reel.title} — ${reel.authorName} on TikTok`}
            startMuted
            onState={setState}
            onProgress={setProgress}
          />
        ) : null}

        {state === 'unavailable' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="gs text-[15px] leading-[1.5] text-on-photo">This video can’t be played here. It may have been removed from TikTok.</p>
            <Pill href={tiktok.url} target="_blank" rel="noopener noreferrer" variant="white" iconAfter={ExternalLink} className="px-5 py-3 text-[14px]">
              Open on TikTok
            </Pill>
          </div>
        ) : (
          <button
            type="button"
            aria-label={state === 'playing' ? 'Tap to mute or unmute, double-tap to like' : 'Tap to play, double-tap to like'}
            onClick={onTap}
            className="absolute inset-0 cursor-default"
          />
        )}

        {active && state === 'paused' ? (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white">
              <Ico icon={Play} size={26} fill="currentColor" />
            </span>
          </span>
        ) : null}
        {burst > 0 ? (
          <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-a1" style={{ animation: 'heart-pop 700ms ease-out forwards' }}>
            <Ico icon={Heart} size={96} fill="currentColor" />
          </span>
        ) : null}
        {flash ? (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white">
              <Ico icon={flash === 'muted' ? VolumeX : Volume2} size={28} />
            </span>
          </span>
        ) : null}

        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
          <div className="h-full bg-white" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      {/* Everything of ours sits under the video, so that nothing covers TikTok's player or its credit. */}
      <div className="shrink-0 px-5 pt-4 pb-4">
        <div className="flex items-center gap-[10px]">
          <Avatar name={reel.authorName} tone={toneFor(reel.authorId)} size={36} />
          <span className="min-w-0 flex-1">
            <span className="gs block truncate text-[15px] font-semibold text-white">{reel.authorName}</span>
            <OnTikTok url={tiktok.url} handle={tiktok.handle} className="text-on-photo" />
          </span>
          <Chip tone="a2">{reel.category}</Chip>
        </div>
        <h2 className="gs mt-3 line-clamp-2 text-[14px] leading-[1.4] text-white">{reel.title}</h2>
        <div className="mt-3 flex items-start justify-between gap-2">
          <RailButton
            icon={Heart}
            label={liked ? 'Unlike' : 'Like'}
            pressed={liked}
            fill={liked ? 'currentColor' : undefined}
            iconClass={liked ? 'text-a1' : undefined}
            caption={compactCount(others + (liked ? 1 : 0))}
            onClick={() => toggleLike(reel.id)}
          />
          <RailButton
            icon={Bookmark}
            label={saved ? 'Remove from saved' : 'Save'}
            pressed={saved}
            fill={saved ? 'currentColor' : undefined}
            caption={saved ? 'Saved' : 'Save'}
            onClick={() => toggleSave(reel.id)}
          />
          <RailButton
            icon={muted ? VolumeX : Volume2}
            label={muted ? 'Turn sound on' : 'Turn sound off'}
            pressed={!muted}
            caption={muted ? 'Muted' : 'Sound'}
            onClick={() => { setMuted(!muted); player.current?.setMuted(!muted); }}
          />
          <RailButton icon={Send} label="Share" caption="Share" onClick={share} />
          <RailButton icon={MoreHorizontal} label="More options" caption="More" onClick={() => setMenu('options')} />
        </div>
      </div>

      <Sheet open={menu === 'options'} onClose={() => setMenu(null)} title={reel.authorName}>
        <SheetAction icon={ExternalLink} onClick={() => { window.open(tiktok.url, '_blank', 'noopener,noreferrer'); setMenu(null); }}>Open on TikTok</SheetAction>
        <SheetAction danger icon={Flag} onClick={() => setMenu('reported')}>Report: not Christian or Catholic, or not appropriate</SheetAction>
      </Sheet>
      <Sheet open={menu === 'reported'} onClose={hide} title="Reported">
        <p className="gs text-[16px] leading-[1.55] text-muted">Thank you. This video has been hidden for you and sent to the moderators.</p>
        <Pill onClick={hide} className="mt-5 w-full p-[14px] text-[15px]">Done</Pill>
      </Sheet>
    </section>
  );
}

/* ---------- the feed ---------- */

/** Vertical, snapping feed. Fills its parent, which sets the height. */
export function ReelFeedView({ feed, startAt }: { feed: ReelFeed; startAt?: string | null }) {
  const reels = useApp((s) => feedReels(s, feed));
  const scroller = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<string | null>(null);
  const current = visible && reels.some((r) => r.id === visible) ? visible : (reels[0]?.id ?? null);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setVisible((entry.target as HTMLElement).dataset.reel ?? null);
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-reel]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  useEffect(() => {
    if (!startAt) return;
    // Scroll the feed itself: scrollIntoView would also move the page under it.
    const root = scroller.current;
    const target = root?.querySelector<HTMLElement>(`[data-reel="${CSS.escape(startAt)}"]`);
    if (root && target) root.scrollTop = target.offsetTop;
  }, [startAt]);

  if (reels.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-8 text-center">
        <p className="gs text-[15px] leading-[1.5] text-on-photo">
          {feed === 'following' ? 'Follow someone to see their reels here.' : 'No reels yet.'}
        </p>
      </div>
    );
  }

  return (
    <div ref={scroller} className="no-scrollbar relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black" tabIndex={0} aria-label="Reels">
      {reels.map((reel) =>
        reel.tiktok
          ? <TikTokReelView key={reel.id} reel={reel} active={reel.id === current} />
          : <ReelView key={reel.id} reel={reel} active={reel.id === current} />,
      )}
    </div>
  );
}

/* ---------- discover ---------- */

function Badge({ children, side }: { children: ReactNode; side: 'left' | 'right' }) {
  return (
    <span className={cx('absolute top-[10px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/55 text-white', side === 'left' ? 'left-[10px]' : 'right-[10px]')}>
      {children}
    </span>
  );
}

function Tile({ tile, scale, onOpenPhoto }: { tile: DiscoverTile; scale: number; onOpenPhoto: (tile: DiscoverTile) => void }) {
  const reel = useApp((s) => (tile.kind === 'reel' && !tile.media ? feedReels(s, 'forYou').find((r) => r.id === tile.reelId) : undefined));
  const height = Math.round(tile.height * scale);
  const content = (
    <Photo media={tile.media ?? reel?.media} className="rounded-[20px]" style={{ height }}>
      {tile.kind === 'reel' ? (
        <Badge side="left"><Ico icon={Play} size={13} fill="currentColor" /></Badge>
      ) : (
        <Badge side="right"><Ico icon={ImageIcon} size={14} /></Badge>
      )}
      {tile.title ? (
        <span className="absolute inset-x-0 bottom-0 block px-[14px] pt-10 pb-[14px] text-left" style={{ background: 'linear-gradient(transparent,rgba(0,0,0,.78))' }}>
          <span className="bq block text-[17px] leading-[1.15] font-bold tracking-[-.02em] text-white">{tile.title}</span>
          {tile.meta ? <span className="gs mt-1 block text-[11px] font-medium text-on-photo">{tile.meta}</span> : null}
        </span>
      ) : null}
    </Photo>
  );

  if (tile.kind === 'reel') {
    return <Link href={`/reels?reel=${tile.reelId}`} aria-label={`Reel: ${tile.title}`} className="hover-lift block">{content}</Link>;
  }
  return <button type="button" aria-label="Open photo" onClick={() => onOpenPhoto(tile)} className="hover-lift block w-full">{content}</button>;
}

function PhotoViewer({ tile, onClose }: { tile: DiscoverTile | null; onClose: () => void }) {
  useDismiss(tile !== null, onClose);
  const url = useMediaUrl(tile?.media);
  if (!tile) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label="Photo">
      <button type="button" aria-label="Close photo" onClick={onClose} className="absolute inset-0 cursor-zoom-out" />
      {/* eslint-disable-next-line @next/next/no-img-element -- user media and bundled assets, shown at natural size */}
      {url ? <img src={url} alt="" className="pointer-events-none relative max-h-dvh max-w-full object-contain" /> : null}
      <button type="button" onClick={onClose} className="gs hover-dim absolute top-5 right-5 rounded-full bg-white/15 px-4 py-[10px] text-[14px] font-semibold text-white backdrop-blur">
        Close
      </button>
    </div>
  );
}

export type DiscoverTab = 'reels' | 'photos' | 'people';

function People() {
  const following = useApp((s) => followingOf(s));
  const suggested = useApp((s) => peopleToFollow(s));
  return (
    <div className="flex flex-col gap-5">
      {suggested.length > 0 ? (
        <section aria-label="People to follow">
          <h3 className="mn mb-[10px] text-muted">To follow</h3>
          <PeopleList people={suggested.slice(0, 40)} empty="" />
        </section>
      ) : null}
      {following.length > 0 ? (
        <section aria-label="People you follow">
          <h3 className="mn mb-[10px] text-muted">Following</h3>
          <PeopleList people={following} empty="" />
        </section>
      ) : null}
      {suggested.length === 0 && following.length === 0 ? <EmptyState>No one to show just now.</EmptyState> : null}
    </div>
  );
}

export function DiscoverGrid({ tab, scale = 1 }: { tab: DiscoverTab; scale?: number }) {
  const [photo, setPhoto] = useState<DiscoverTile | null>(null);
  if (tab === 'people') return <People />;

  const columns = DISCOVER_COLUMNS.map((column) => column.filter((t) => tab === 'reels' || t.kind === 'photo'));
  return (
    <>
      <div className="grid grid-cols-2 gap-[10px]">
        {columns.map((column, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-[10px]">
            {column.map((tile) => <Tile key={tile.id} tile={tile} scale={scale} onOpenPhoto={setPhoto} />)}
          </div>
        ))}
      </div>
      <PhotoViewer tile={photo} onClose={() => setPhoto(null)} />
    </>
  );
}

export const DISCOVER_TABS: SegmentItem<DiscoverTab>[] = [
  { id: 'reels', label: 'Reels' },
  { id: 'photos', label: 'Photos' },
  { id: 'people', label: 'People' },
];
