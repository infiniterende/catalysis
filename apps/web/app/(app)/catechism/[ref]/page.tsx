'use client';

import { cccLabel, cccPageFor, cccSpan } from '@catalysis/api';
import type { CccTocEntry } from '@catalysis/catechism';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Footnotes, PageText, paragraphId } from '@/components/catechism';
import { BackLink, Page } from '@/components/shell';
import { Card, EmptyState, PageTitle, Pill, Skeleton, SkeletonLines } from '@/components/ui';
import { usePage, useToc } from '@/lib/catechism';

/** `/catechism/2267` opens the page holding §2267; `/catechism/p44` opens a page by its id. */
function resolve(ref: string, toc: CccTocEntry[] | undefined): { page?: string; target?: number; invalid?: boolean } {
  if (/^p\d+$/.test(ref)) return { page: ref };
  const n = Number(ref);
  if (!/^\d{1,4}$/.test(ref) || n < 1 || n > 2865) return { invalid: true };
  if (!toc) return { target: n };
  const entry = cccPageFor(toc, n);
  return entry?.page ? { page: entry.page, target: n } : { invalid: true };
}

export default function CatechismReader() {
  const { ref } = useParams<{ ref: string }>();
  const toc = useToc();
  const { page: pageId, target, invalid } = resolve(decodeURIComponent(ref), toc);
  const page = usePage(pageId);

  const neighbours = useMemo(() => {
    if (!toc || !pageId) return {};
    const withPages = toc.filter((t) => t.page);
    const at = withPages.findIndex((t) => t.page === pageId);
    return { previous: withPages[at - 1], next: withPages[at + 1], here: withPages[at] };
  }, [toc, pageId]);

  useEffect(() => {
    if (!page || target === undefined) return;
    document.getElementById(paragraphId(target))?.scrollIntoView({ block: 'center' });
  }, [page, target]);

  if (invalid || page === null) {
    return (
      <Page>
        <BackLink href="/catechism">Catechism</BackLink>
        <PageTitle>Not found</PageTitle>
        <EmptyState className="mt-4">The Catechism has paragraphs 1 to 2865. Try a number in that range.</EmptyState>
      </Page>
    );
  }

  const label = (entry: CccTocEntry) => (entry.label ? `${entry.label}: ${entry.title}` : entry.title);
  const span = neighbours.here ? cccSpan(neighbours.here) : undefined;
  const range = span ? cccLabel(span) : undefined;

  return (
    <Page>
      <BackLink href="/catechism">Catechism</BackLink>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card as="article" aria-label={page?.title ?? 'Catechism'} className="min-w-0 p-6 md:p-10 lg:col-span-8">
          {!page ? (
            <div role="status" aria-label="Loading">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="mt-4 h-10 w-3/4" />
              <SkeletonLines lines={10} className="mt-8" />
            </div>
          ) : (
            <>
              {page.path.length > 0 ? (
                <nav aria-label="Where this is" className="gs mb-3 text-[12px] leading-[1.5] text-muted">
                  {page.path.join(' › ')}
                </nav>
              ) : null}
              {page.label ? <div className="mn text-a1">{page.label}</div> : null}
              <h1 className="bq mt-1 text-[30px] leading-[1.05] font-bold tracking-[-.03em] text-ink md:text-[40px]">{page.title}</h1>
              {range ? <p className="gs mt-2 text-[13px] text-muted">{range}</p> : null}
              <div className="mt-8">
                <PageText page={page} target={target} />
              </div>
              <Footnotes page={page} />
            </>
          )}
          <nav aria-label="Pages" className="mt-8 grid grid-cols-2 gap-3">
            {neighbours.previous?.page ? (
              <Pill href={`/catechism/${neighbours.previous.page}`} variant="inset" icon={ArrowLeft} className="justify-start truncate px-[18px] py-[14px] text-[14px]">
                <span className="truncate">{label(neighbours.previous)}</span>
              </Pill>
            ) : <span />}
            {neighbours.next?.page ? (
              <Pill href={`/catechism/${neighbours.next.page}`} variant="inset" iconAfter={ArrowRight} className="justify-end truncate px-[18px] py-[14px] text-[14px]">
                <span className="truncate">{label(neighbours.next)}</span>
              </Pill>
            ) : null}
          </nav>
        </Card>

        <aside aria-label="About this page" className="flex flex-col gap-4 lg:col-span-4 lg:sticky lg:top-[84px] lg:self-start">
          {target !== undefined ? (
            <Card surface="a3" className="p-[22px]">
              <div className="mn">Paragraph {target}</div>
              <p className="gs mt-2 text-[14px] leading-[1.5]">Ask Lumen to explain it, with the Scripture behind it.</p>
              <Pill
                href={`/lumen?q=${encodeURIComponent(`Explain CCC ${target} in plain words.`)}`}
                variant="dark"
                icon={Sparkles}
                className="mt-4 px-[18px] py-[11px] text-[14px]"
              >
                Ask Lumen
              </Pill>
            </Card>
          ) : null}
          <Card surface="inset" className="p-[22px]">
            <p className="gs text-[13px] leading-[1.5] text-muted">
              Catechism of the Catholic Church, English translation © Libreria Editrice Vaticana. §2267 as revised in 2018.
            </p>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
