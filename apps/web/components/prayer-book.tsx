'use client';

import { chapterOf, type GuidedStep } from '@catalysis/api';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { cx, Ico } from './ui';

/** The words of a prayer, set in the scripture face, one paragraph per line. */
export function PrayerWords({ text, onSolid, className }: { text: string; onSolid?: boolean; className?: string }) {
  return (
    <div className={cx('nr flex flex-col gap-[.7em] leading-[1.6]', onSolid ? 'text-white' : 'text-ink', className)}>
      {text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
    </div>
  );
}

/** A passage named by a step, linked to its chapter in the reader. */
export function ScriptureLink({ reference, onSolid }: { reference: string; onSolid?: boolean }) {
  const chapter = chapterOf(reference);
  const classes = cx(
    'gs inline-flex items-center gap-[7px] rounded-full px-3 py-[6px] text-[13px] font-semibold',
    onSolid ? 'bg-white/15 text-white' : 'bg-inset text-ink',
  );
  const content = (
    <>
      <Ico icon={BookOpen} size={14} />
      {reference}
    </>
  );
  if (!chapter) return <span className={classes}>{content}</span>;
  return (
    <Link href={`/scripture/${chapter.bookId}/${chapter.chapter}`} aria-label={`Read ${reference}`} className={cx(classes, 'hover-dim')}>
      {content}
    </Link>
  );
}

export const stepCount = (steps: GuidedStep[]) => (steps.length === 1 ? '1 prayer' : `${steps.length} steps`);

export const prayerHref = (id: string) => `/prayer/book/${id}`;
export const guidedHref = (id: string) => `/prayer/guided/${id}`;
export const journalHref = (prayerId?: string) => (prayerId ? `/prayer/journal?new=1&prayer=${prayerId}` : '/prayer/journal?new=1');
