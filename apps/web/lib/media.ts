'use client';

/**
 * Media helpers. Bundled images resolve to /public. A photo a member adds is
 * sent to the server (`/api/uploads/<id>`), so that others can see it; without
 * a server, and for videos, it is kept in IndexedDB on this device and
 * referenced as `idb:<id>`.
 */
import type { AssetKey, Media } from '@catalysis/api';
import { useEffect, useState } from 'react';

export const ASSETS: Record<AssetKey, string> = {
  angel: '/images/angel.webp',
  stJoseph: '/images/st-joseph.webp',
  rosary: '/images/rosary.jpg',
  monstrance: '/images/monstrance.jpg',
};

const DB = 'catalysis-media';
const STORE = 'blobs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBlob(blob: Blob): Promise<string> {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return `idb:${id}`;
}

/**
 * Keeps a photo where other members can see it. Falls back to this device when
 * there is no server to take it. Throws, with a message fit to show, when the
 * server turns the photo down.
 */
export async function savePhoto(blob: Blob): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
      body: blob,
      credentials: 'same-origin',
    });
  } catch {
    return saveBlob(blob);
  }
  if (response.status === 201) {
    const { url } = (await response.json()) as { url?: string };
    if (url) return url;
  }
  // No database, or not signed in to one: the app is keeping its data on this device.
  if (response.status === 503 || response.status === 401 || response.status === 404) return saveBlob(blob);
  let message = 'That photo could not be added.';
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) message = data.error;
  } catch {
    // keep the default message
  }
  throw new Error(message);
}

async function loadBlob(id: string): Promise<Blob | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
}

const objectUrls = new Map<string, string>();

async function resolveUrl(url: string): Promise<string | undefined> {
  if (!url.startsWith('idb:')) return url;
  const cached = objectUrls.get(url);
  if (cached) return cached;
  const blob = await loadBlob(url.slice(4));
  if (!blob) return undefined;
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.set(url, objectUrl);
  return objectUrl;
}

/** The URL to render for a piece of media, or `undefined` while it loads or if there is none. */
export function useMediaUrl(media: Media | undefined): string | undefined {
  const direct = media?.url && !media.url.startsWith('idb:') ? media.url : undefined;
  const bundled = !media?.url && media?.asset ? ASSETS[media.asset] : undefined;
  const stored = media?.url?.startsWith('idb:') ? media.url : undefined;
  const [resolved, setResolved] = useState<{ key: string; url: string } | undefined>();

  useEffect(() => {
    if (!stored) return;
    let live = true;
    resolveUrl(stored)
      .then((url) => {
        if (live && url) setResolved({ key: stored, url });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [stored]);

  if (stored) return resolved?.key === stored ? resolved.url : objectUrls.get(stored);
  return direct ?? bundled;
}

/** Downscales a photo so it is cheap to keep and quick to draw. */
export async function preparePhoto(file: Blob, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.85));
}

export function videoDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That video could not be read.'));
    };
    video.src = url;
  });
}
