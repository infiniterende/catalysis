'use client';

/** The browser's side of TikTok videos in Reels: the approved list, putting a video forward, and review. */
import type { TikTokVideo } from '@catalysis/api';

export interface ReviewList {
  pending: (TikTokVideo & { screening: string })[];
  reported: (TikTokVideo & { reports: number })[];
  creators: { handle: string; name: string }[];
}

export interface TikTokLists {
  videos: TikTokVideo[];
  moderator: boolean;
  review?: ReviewList;
}

export type Submitted =
  | { ok: true; status: 'approved' | 'pending' | 'declined'; message: string; video?: TikTokVideo }
  | { ok: false; message: string };

const UNREACHABLE = 'We couldn’t reach Catalysis. Check your connection and try again.';

async function send(path: string, body?: object): Promise<{ status: number; data: Record<string, unknown> }> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // no body
  }
  return { status: response.status, data };
}

export async function fetchTikTok(): Promise<TikTokLists | null> {
  try {
    const { status, data } = await send('/api/reels/tiktok');
    return status === 200 ? (data as unknown as TikTokLists) : null;
  } catch {
    return null;
  }
}

export async function submitTikTok(url: string): Promise<Submitted> {
  try {
    const { status, data } = await send('/api/reels/tiktok', { url });
    if (status === 200 && typeof data.status === 'string') return { ok: true, ...(data as Omit<Extract<Submitted, { ok: true }>, 'ok'>) };
    return { ok: false, message: typeof data.error === 'string' ? data.error : 'That didn’t work. Please try again.' };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

type Changed = { ok: true; lists: TikTokLists } | { ok: false; message: string };

async function change(path: string, body: object): Promise<Changed> {
  try {
    const { status, data } = await send(path, body);
    if (status === 200) return { ok: true, lists: data as unknown as TikTokLists };
    return { ok: false, message: typeof data.error === 'string' ? data.error : 'That didn’t work. Please try again.' };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

export const reviewTikTok = (id: string, action: 'approve' | 'reject' | 'remove', topic?: string) =>
  change('/api/reels/tiktok/review', { id, action, topic });

export const setTrustedCreator = (handle: string, on: boolean, name?: string) =>
  change('/api/reels/tiktok/creators', { handle, on, name });

/** TikTok's embed player for a video. See developers.tiktok.com/doc/embed-player. */
export function playerUrl(videoId: string, options: { autoplay?: boolean; controls?: boolean } = {}): string {
  const params = new URLSearchParams({
    autoplay: options.autoplay ? '1' : '0',
    controls: options.controls ? '1' : '0',
    loop: '1',
    // When the video ends, suggest only the same creator's videos, not all of TikTok.
    rel: '0',
    music_info: '0',
    description: '0',
    fullscreen_button: '0',
    native_context_menu: '0',
  });
  return `https://www.tiktok.com/player/v1/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export const TIKTOK_ORIGIN = 'https://www.tiktok.com';
export const TOPICS = ['Prayer', 'Scripture', 'Saints', 'Sacraments', 'Teaching', 'Testimony', 'Music', 'Parish life', 'Faith'];
