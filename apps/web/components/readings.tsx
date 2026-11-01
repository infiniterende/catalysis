'use client';

import { READING_TITLES, readingRef } from '@catalysis/api';
import { BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import type { DayReading } from '@/lib/readings';
import { cx, Ico } from './ui';

export const readingId = (kind: string) => `reading-${kind}`;

export function citationHref(citation: string): string | undefined {
  const ref = readingRef(citation);
  return ref ? `/scripture/${ref.bookId}/${ref.chapter}?verse=${ref.verse}` : undefined;
}

export function ReadingView({ reading, usccb }: { reading: DayReading; usccb: string }) {
  const href = citationHref(reading.citation);
  const verses = reading.verses ?? [];
  const psalm = reading.kind === 'psalm';
  return (
    <section aria-labelledby={readingId(reading.kind)} className="scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={readingId(reading.kind)} className="mn text-a1">{READING_TITLES[reading.kind]}</h2>
        {href ? (
          <Link href={href} className="gs hover-dim inline-flex items-center gap-[6px] text-[14px] font-semibold text-ink underline decoration-line underline-offset-4">
            <Ico icon={BookOpen} size={14} />
            {reading.citation}
          </Link>
        ) : (
          <span className="gs text-[14px] font-semibold text-ink">{reading.citation}</span>
        )}
      </div>
      {verses.length === 0 ? (
        <p className="gs mt-4 text-[15px] leading-[1.5] text-muted">
          This passage isn’t in the app’s Bible.{' '}
          <a href={usccb} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-2">
            Read it on the USCCB’s site
          </a>
          .
        </p>
      ) : (
        <p className={cx('nr mt-4 leading-[1.65] text-ink', psalm ? 'text-[18px] md:text-[19px]' : 'text-[19px] md:text-[20px]')}>
          {verses.map((verse, i) => {
            const newChapter = i > 0 && verses[i - 1]?.chapter !== verse.chapter;
            const gap = i > 0 && !newChapter && verses[i - 1]!.number + 1 !== verse.number;
            return (
              <Fragment key={`${verse.chapter}:${verse.number}`}>
                {gap ? <span aria-hidden className="mx-1 text-subtle">…</span> : null}
                <sup className={cx('gs mr-[3px] text-[0.6em] font-bold text-a1', i > 0 && 'ml-[3px]')}>
                  {newChapter || i === 0 ? `${verse.chapter}:${verse.number}` : verse.number}
                </sup>
                {verse.text}{' '}
              </Fragment>
            );
          })}
        </p>
      )}
      {psalm ? (
        <a href={usccb} target="_blank" rel="noopener noreferrer" className="gs hover-dim mt-3 inline-flex items-center gap-[6px] text-[13px] text-muted underline underline-offset-2">
          The refrain sung between the verses is on the USCCB’s page
          <Ico icon={ExternalLink} size={12} />
        </a>
      ) : null}
    </section>
  );
}
