'use client';

import type { CccBlock, CccNoteRef, CccPage, CccRun } from '@catalysis/catechism';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { scriptureHref } from '@/lib/catechism';
import { Chip, cx } from './ui';

export const paragraphId = (n: number) => `ccc-${n}`;
/** The note added with the 2018 text of §2267 is marked with an asterisk, not a number from the 1997 sequence. */
const noteLabel = (key: string) => (key === '2267' ? '*' : key);
const noteId = (pageId: string, key: string) => `note-${pageId}-${key}`;

export function Runs({ runs, pageId }: { runs: CccRun[]; pageId: string }) {
  return (
    <>
      {runs.map((run, i) => {
        if (typeof run === 'string') return <Fragment key={i}>{run}</Fragment>;
        if ('f' in run) {
          return (
            <sup key={i} className="gs ml-[1px] text-[0.62em] font-semibold">
              <a href={`#${noteId(pageId, run.f)}`} aria-label={`Footnote ${noteLabel(run.f)}`} className="hover-dim text-a1">{noteLabel(run.f)}</a>
            </sup>
          );
        }
        if ('s' in run) {
          return (
            <Link key={i} href={scriptureHref(run.s)} className={cx('hover-dim text-a1 underline decoration-a1/40 underline-offset-2', run.i && 'italic')}>
              {run.t}
            </Link>
          );
        }
        return <span key={i} className={cx(run.i && 'italic', run.b && 'font-semibold')}>{run.t}</span>;
      })}
    </>
  );
}

function NoteRefs({ refs }: { refs: CccNoteRef[] }) {
  const parts: ReactNode[] = [];
  refs.forEach((ref, i) => {
    if (i > 0) parts.push('; ');
    parts.push(
      ref.s ? (
        <Link key={i} href={scriptureHref(ref.s)} className="hover-dim text-ink underline decoration-line underline-offset-2">{ref.t.replace(/[.;]$/, '')}</Link>
      ) : (
        <Fragment key={i}>{ref.t.replace(/[.;]$/, '')}</Fragment>
      ),
    );
  });
  return <>{parts}</>;
}

export function Footnotes({ page }: { page: CccPage }) {
  const keys = Object.keys(page.notes);
  if (keys.length === 0) return null;
  return (
    <section aria-label="Footnotes" className="mt-10 border-t border-line pt-6">
      <h2 className="mn text-muted">Footnotes</h2>
      <ol className="gs mt-3 flex flex-col gap-2 text-[13px] leading-[1.5] text-muted">
        {keys.map((key) => (
          <li key={key} id={noteId(page.id, key)} className="scroll-mt-28">
            <span className="mr-2 font-semibold text-a1">{noteLabel(key)}</span>
            <NoteRefs refs={page.notes[key] ?? []} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Heading({ block }: { block: Extract<CccBlock, { h: string }> }) {
  if (block.l === 1) return <div className="mt-4"><Chip tone="a2">{block.h}</Chip></div>;
  if (block.l === 2) return <h3 className="bq mt-6 text-[24px] leading-[1.15] font-bold tracking-[-.03em] text-ink">{block.h}</h3>;
  return <h4 className="gs mt-3 text-[15px] font-semibold text-ink">{block.h}</h4>;
}

/** The page's text, with each numbered paragraph's number in a margin. `target` is highlighted. */
/** For each block, the numbered paragraph it belongs to: unnumbered paragraphs belong to the one above them. */
function owners(blocks: CccBlock[]): (number | undefined)[] {
  let current: number | undefined;
  return blocks.map((block) => {
    if ('h' in block) current = undefined;
    else if (block.n !== undefined) current = block.n;
    return current;
  });
}

export function PageText({ page, target }: { page: CccPage; target?: number }) {
  const owner = owners(page.blocks);
  return (
    <div className="flex flex-col gap-4">
      {page.blocks.map((block, i) => {
        if ('h' in block) return <Heading key={i} block={block} />;
        const highlighted = target !== undefined && owner[i] === target;
        return (
          <div
            key={i}
            id={block.n !== undefined ? paragraphId(block.n) : undefined}
            className={cx('grid scroll-mt-28 grid-cols-[2.6rem_minmax(0,1fr)] gap-2 rounded-[14px] md:grid-cols-[3.4rem_minmax(0,1fr)] md:gap-3', highlighted && '-mx-3 bg-a2/25 px-3 py-2')}
          >
            <span className="pt-[5px] text-right">
              {block.n !== undefined ? (
                <Link href={`/catechism/${block.n}`} scroll={false} className="gs hover-dim text-[13px] font-bold text-a1" aria-label={`Paragraph ${block.n}`}>
                  {block.n}
                </Link>
              ) : null}
            </span>
            <p className={cx('nr leading-[1.6]', block.q ? 'border-l-2 border-a4 pl-4 text-[17px] text-muted' : 'text-[18px] text-ink md:text-[19px]')}>
              <Runs runs={block.r} pageId={page.id} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** The plain text of one numbered paragraph and the unnumbered ones that follow it. */
export function paragraphBlocks(page: CccPage, n: number): Extract<CccBlock, { r: CccRun[] }>[] {
  const out: Extract<CccBlock, { r: CccRun[] }>[] = [];
  let inside = false;
  for (const block of page.blocks) {
    if ('h' in block) {
      if (inside) break;
      continue;
    }
    if (block.n !== undefined) {
      if (inside) break;
      inside = block.n === n;
    }
    if (inside) out.push(block);
  }
  return out;
}
