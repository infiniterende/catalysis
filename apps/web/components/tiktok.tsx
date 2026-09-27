'use client';

import type { TikTokVideo } from '@catalysis/api';
import { ExternalLink, Link2 } from 'lucide-react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from 'react';
import { useAccount, useApp } from '@/lib/store';
import { playerUrl, submitTikTok, TIKTOK_ORIGIN, type Submitted } from '@/lib/tiktok';
import { cx, Field, Ico, Pill, Sheet } from './ui';

/* ---------- TikTok's player ---------- */

export type PlayerState = 'loading' | 'playing' | 'paused' | 'unavailable';

export interface PlayerHandle {
  play(): void;
  pause(): void;
  setMuted(muted: boolean): void;
}

/**
 * TikTok's own embed player in an iframe: the video is streamed by TikTok, not
 * by Catalysis. The page talks to it with the messages TikTok documents, so the
 * feed can start, stop and mute it.
 */
export function TikTokPlayer({
  videoId, title, controls, startMuted, onState, onProgress, ref, className,
}: {
  videoId: string;
  title: string;
  /** Show TikTok's own controls. The feed draws its own, so it leaves them off. */
  controls?: boolean;
  startMuted?: boolean;
  onState?: (state: PlayerState) => void;
  onProgress?: (fraction: number) => void;
  ref?: Ref<PlayerHandle>;
  className?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const report = useRef({ onState, onProgress });
  useEffect(() => {
    report.current = { onState, onProgress };
  });

  const send = useCallback((type: string, value?: unknown) => {
    frame.current?.contentWindow?.postMessage({ 'x-tiktok-player': true, type, value }, TIKTOK_ORIGIN);
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => send('play'),
    pause: () => send('pause'),
    setMuted: (muted) => send(muted ? 'mute' : 'unMute'),
  }), [send]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== TIKTOK_ORIGIN || event.source !== frame.current?.contentWindow) return;
      const data = event.data as { 'x-tiktok-player'?: boolean; type?: string; value?: unknown } | null;
      if (!data || typeof data !== 'object' || !data['x-tiktok-player']) return;
      if (data.type === 'onPlayerReady') {
        if (startMuted) send('mute');
        if (!controls) send('play');
      } else if (data.type === 'onStateChange') {
        if (data.value === 1) report.current.onState?.('playing');
        else if (data.value === 2 || data.value === 0) report.current.onState?.('paused');
      } else if (data.type === 'onCurrentTime') {
        const time = data.value as { currentTime?: number; duration?: number } | undefined;
        if (time?.duration) report.current.onProgress?.(Math.min(1, (time.currentTime ?? 0) / time.duration));
      } else if (data.type === 'onPlayerError') {
        const code = (data.value as { errorCode?: number } | undefined)?.errorCode;
        // 3002 is the browser refusing to start by itself: the video is fine, it waits for a tap.
        report.current.onState?.(code === 3002 ? 'paused' : 'unavailable');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [controls, send, startMuted]);

  return (
    <iframe
      ref={frame}
      src={playerUrl(videoId, { autoplay: !controls, controls })}
      title={title}
      allow="autoplay; encrypted-media; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      // The feed handles taps itself, so that swiping between reels works over the video.
      tabIndex={controls ? 0 : -1}
      className={cx('block h-full w-full border-0 bg-black', !controls && 'pointer-events-none', className)}
    />
  );
}

export function OnTikTok({ url, handle, className }: { url: string; handle: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('gs hover-dim inline-flex items-center gap-[6px] text-[12px] font-semibold', className)}
    >
      @{handle} on TikTok
      <Ico icon={ExternalLink} size={12} />
    </a>
  );
}

/* ---------- putting a video forward ---------- */

export function AddTikTokForm({ onAdded }: { onAdded?: (video: TikTokVideo) => void }) {
  const tiktok = useApp((s) => s.tiktok);
  const setTikTok = useApp((s) => s.setTikTok);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Submitted | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setResult(null);
    const outcome = await submitTikTok(url.trim());
    setBusy(false);
    setResult(outcome);
    if (outcome.ok && outcome.status === 'approved' && outcome.video) {
      const video = outcome.video;
      setTikTok([video, ...tiktok.filter((v) => v.id !== video.id)]);
      onAdded?.(video);
    }
    if (outcome.ok) setUrl('');
  };

  const tone = !result ? '' : !result.ok || result.status === 'declined' ? 'bg-a6 text-on-a' : result.status === 'approved' ? 'bg-a2 text-on-a' : 'bg-a3 text-on-a';
  return (
    <form onSubmit={submit} noValidate>
      <Field
        id="tiktok-url"
        label="Link to the video"
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.tiktok.com/@name/video/…"
        autoComplete="off"
        trailing={<Ico icon={Link2} size={16} className="text-subtle" />}
      />
      <Pill type="submit" disabled={busy || !url.trim()} className="mt-4 w-full p-[15px] text-[15px]">
        {busy ? 'Checking the video…' : 'Add to Reels'}
      </Pill>
      {result ? <p role="status" className={cx('gs mt-4 rounded-[16px] px-4 py-3 text-[14px] leading-[1.45] font-medium', tone)}>{result.message}</p> : null}
    </form>
  );
}

/** "Add from TikTok", for members of an app with real accounts. */
export function AddTikTok({ open, onClose }: { open: boolean; onClose: () => void }) {
  const moderator = useApp((s) => s.user?.role === 'moderator');
  return (
    <Sheet open={open} onClose={onClose} title="Add from TikTok">
      <p className="gs mb-5 text-[15px] leading-[1.5] text-muted">
        Reels shows Christian and Catholic videos only. The video stays on TikTok and plays in TikTok’s player, with credit to its creator.
        {moderator ? '' : ' A moderator looks at each suggestion before it appears.'}
      </p>
      <AddTikTokForm />
      {moderator ? <Pill href="/reels/review" variant="ghost" className="mt-3 w-full p-[14px] text-[14px]">Review videos</Pill> : null}
    </Sheet>
  );
}

/** True when videos can be added: the app has real accounts and a database. */
export function useCanAddTikTok(): boolean {
  const { backend, guest } = useAccount();
  return backend === 'server' && !guest;
}
