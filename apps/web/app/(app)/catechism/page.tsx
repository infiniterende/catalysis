'use client';

import { catechismHref, cccForDay, cccLabel, cccPageFor, cccSpan, parseCccNumber } from '@catalysis/api';
import type { CccTocEntry } from '@catalysis/catechism';
import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react';
import { paragraphBlocks, Runs } from '@/components/catechism';
import { Page } from '@/components/shell';
import { Card, cx, EmptyState, Ico, PageTitle, Pill, Skeleton, SkeletonLines, TONE_BG } from '@/components/ui';
import { loadSearch, usePage, useToc } from '@/lib/catechism';
import { useToday } from '@/lib/hooks';

const PART_TONES = ['a3', 'a2', 'a5', 'a4', 'a6'] as const;

const entryHref = (entry: CccTocEntry) => (entry.first !== undefined ? catechismHref(entry.first) : entry.page ? `/catechism/${entry.page}` : '/catechism');

/* ---------- search ---------- */

interface Hit {
  n: number;
  before: string;
  match: string;
  after: string;
}

function useSearch(query: string): Hit[] | undefined {
  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter((w) => w.length > 1), [query]);
  const [index, setIndex] = useState<[number, string][] | undefined>();
  const wanted = words.length > 0 && words.join('').length >= 3;

  useEffect(() => {
    if (!wanted || index) return;
    let live = true;
    void loadSearch().then((data) => live && setIndex(data));
    return () => {
      live = false;
    };
  }, [wanted, index]);

  return useMemo(() => {
    if (!wanted || !index) return undefined;
    const hits: Hit[] = [];
    for (const [n, text] of index) {
      const lower = text.toLowerCase();
      if (!words.every((w) => lower.includes(w))) continue;
      const at = lower.indexOf(words[0] ?? '');
      const start = Math.max(0, at - 70);
      hits.push({
        n,
        before: `${start > 0 ? '…' : ''}${text.slice(start, at)}`,
        match: text.slice(at, at + (words[0]?.length ?? 0)),
        after: `${text.slice(at + (words[0]?.length ?? 0), at + 160)}…`,
      });
      if (hits.length >= 60) break;
    }
    return hits;
  }, [wanted, index, words]);
}

function Results({ query }: { query: string }) {
  const hits = useSearch(query);
  if (!hits) return <SkeletonLines lines={5} className="mt-6" />;
  if (hits.length === 0) return <EmptyState className="mt-6">No paragraph contains all of “{query.trim()}”.</EmptyState>;
  return (
    <ul className="mt-6 flex flex-col gap-[10px]" aria-label="Paragraphs found">
      {hits.map((hit) => (
        <li key={hit.n}>
          <Link href={catechismHref(hit.n)} className="hover-dim flex gap-4 rounded-[18px] bg-inset px-[18px] py-[14px]">
            <span className="gs w-12 shrink-0 pt-[2px] text-[13px] font-bold text-a1">§{hit.n}</span>
            <span className="nr min-w-0 text-[16px] leading-[1.5] text-ink">
              {hit.before}
              <mark className="rounded bg-a2 px-[2px] text-on-a">{hit.match}</mark>
              {hit.after}
            </span>
          </Link>
        </li>
      ))}
      {hits.length === 60 ? <li className="gs px-2 text-[13px] text-muted">Showing the first 60. Add a word to narrow the search.</li> : null}
    </ul>
  );
}

/* ---------- today's reading ---------- */

/** Today's portion of the Catechism read through in a year. */
function OfTheDay({ toc }: { toc: CccTocEntry[] | undefined }) {
  const { today } = useToday();
  const range = cccForDay(today);
  const n = range.start;
  const entry = toc ? cccPageFor(toc, n) : undefined;
  const page = usePage(entry?.page);
  const blocks = page ? paragraphBlocks(page, n) : [];
  return (
    <Card as="section" surface="solid" aria-label="Today’s reading" className="flex flex-col gap-5 p-[26px] lg:col-span-5">
      <div className="flex items-center justify-between gap-3">
        <span className="mn text-a2">The Catechism in a year</span>
        <span className="gs text-[13px] font-bold text-white">{cccLabel(range)}</span>
      </div>
      {!page ? (
        <SkeletonLines lines={5} />
      ) : (
        <div className="nr line-clamp-[9] text-[18px] leading-[1.55] text-white">
          {blocks.map((block, i) => <p key={i} className={cx(i > 0 && 'mt-3')}><Runs runs={block.r} pageId={page.id} /></p>)}
        </div>
      )}
      {page ? <p className="gs text-[13px] text-on-solid-muted">{page.title}</p> : null}
      <Pill href={catechismHref(n)} variant="highlight" iconAfter={ArrowRight} className="self-start px-[20px] py-[12px] text-[14px]">
        Read today’s {range.end - range.start + 1} paragraphs
      </Pill>
    </Card>
  );
}

/* ---------- contents ---------- */

function Contents({ toc }: { toc: CccTocEntry[] }) {
  const parts = toc.map((entry, i) => ({ entry, i })).filter(({ entry }) => entry.depth === 1);
  return (
    <div className="flex flex-col gap-3">
      {parts.map(({ entry, i }, p) => {
        const end = parts[p + 1]?.i ?? toc.length;
        const children = toc.slice(i + 1, end);
        const span = cccSpan(entry);
        const range = span ? cccLabel(span) : '';
        return (
          <details key={entry.id} className="group rounded-[24px] border border-line bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
              <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-on-a', TONE_BG[PART_TONES[p % PART_TONES.length] ?? 'a3'])}>
                <span className="bq text-[20px] font-bold">{p === 0 ? 'P' : p}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="mn block text-muted">{entry.label ?? 'Prologue'}{range ? ` · ${range}` : ''}</span>
                <span className="bq mt-1 block text-[22px] leading-[1.1] font-bold tracking-[-.03em] text-ink">{entry.title}</span>
              </span>
              <Ico icon={ArrowRight} size={18} className="shrink-0 text-subtle transition-transform group-open:rotate-90" />
            </summary>
            <ul className="gs flex flex-col gap-[2px] px-3 pb-4">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={entryHref(child)}
                    className={cx('hover-inset flex items-baseline gap-3 rounded-[12px] py-2 pr-3', child.depth <= 3 ? 'font-semibold text-ink' : 'text-muted')}
                    style={{ paddingLeft: `${12 + (child.depth - 2) * 16}px` }}
                  >
                    <span className="min-w-0 flex-1 text-[14px] leading-[1.4]">
                      {child.label ? <span className="text-a1">{child.label} · </span> : null}
                      {child.title}
                    </span>
                    {child.first !== undefined ? <span className="shrink-0 text-[12px] text-subtle">{child.first}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

function Catechism() {
  const router = useRouter();
  const toc = useToc();
  const asked = useSearchParams().get('q') ?? '';
  const [query, setQuery] = useState(asked);
  const deferred = useDeferredValue(query);
  const number = parseCccNumber(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (number) router.push(catechismHref(number));
  };

  return (
    <Page>
      <div className="mb-[22px] flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle accent="of the Catholic Church">Catechism</PageTitle>
        <form onSubmit={submit} role="search" className="flex items-center gap-[10px] rounded-full bg-inset px-[18px] md:w-[360px]">
          <Ico icon={Search} size={16} className="text-subtle" />
          <label htmlFor="ccc-search" className="sr-only">Search the Catechism, or go to a paragraph number</label>
          <input
            id="ccc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, or a number like 2558"
            className="gs min-w-0 flex-1 py-[13px] text-[15px] text-ink"
          />
        </form>
      </div>

      {number ? (
        <Link href={catechismHref(number)} className="hover-dim mb-4 flex items-center justify-between gap-3 rounded-[18px] bg-a2 px-5 py-4 text-on-a">
          <span className="gs text-[15px] font-semibold">Go to paragraph {number}</span>
          <Ico icon={ArrowRight} size={18} />
        </Link>
      ) : null}

      {deferred.trim() && !number ? (
        <Results query={deferred} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <OfTheDay toc={toc} />
          <section aria-label="Contents" className="lg:col-span-7">
            {toc ? <Contents toc={toc} /> : <Skeleton className="h-[420px] rounded-[24px]" />}
          </section>
        </div>
      )}
    </Page>
  );
}

export default function CatechismPage() {
  return (
    <Suspense fallback={<Page><Skeleton className="h-[420px] rounded-[24px]" /></Page>}>
      <Catechism />
    </Suspense>
  );
}
