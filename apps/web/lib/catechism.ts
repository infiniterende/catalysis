'use client';

/** Loads the Catechism a piece at a time from @catalysis/catechism, which the bundler splits into chunks. */
import type { CccPage, CccScripture, CccTocEntry } from '@catalysis/catechism';
import { useEffect, useState } from 'react';

let toc: Promise<CccTocEntry[]> | undefined;
let search: Promise<[number, string][]> | undefined;
const pages = new Map<string, Promise<CccPage | undefined>>();
const ready = new Map<string, CccPage | undefined>();
let tocReady: CccTocEntry[] | undefined;

export function loadToc(): Promise<CccTocEntry[]> {
  toc ??= import('@catalysis/catechism').then((m) => m.loadCatechismToc()).then((t) => (tocReady = t));
  return toc;
}

export function loadPage(id: string): Promise<CccPage | undefined> {
  let pending = pages.get(id);
  if (!pending) {
    pending = import('@catalysis/catechism').then((m) => m.loadCatechismPage(id)).then((p) => {
      ready.set(id, p);
      return p;
    });
    pages.set(id, pending);
  }
  return pending;
}

export function loadSearch(): Promise<[number, string][]> {
  search ??= import('@catalysis/catechism').then((m) => m.loadCatechismSearch());
  return search;
}

/** The table of contents, or `undefined` while it loads. */
export function useToc(): CccTocEntry[] | undefined {
  const [value, setValue] = useState(tocReady);
  useEffect(() => {
    let live = true;
    void loadToc().then((t) => live && setValue(t));
    return () => {
      live = false;
    };
  }, []);
  return value;
}

/** A page, `null` if there is no such page, or `undefined` while it loads. */
export function usePage(id: string | undefined): CccPage | null | undefined {
  const [value, setValue] = useState<{ id: string; page: CccPage | null } | undefined>();
  useEffect(() => {
    if (!id) return;
    let live = true;
    void loadPage(id).then((page) => live && setValue({ id, page: page ?? null }));
    return () => {
      live = false;
    };
  }, [id]);
  if (!id) return null;
  if (value?.id === id) return value.page;
  return ready.has(id) ? (ready.get(id) ?? null) : undefined;
}

export const scriptureHref = (s: CccScripture) => `/scripture/${s.b}/${s.c}${s.v ? `?verse=${s.v}` : ''}`;
