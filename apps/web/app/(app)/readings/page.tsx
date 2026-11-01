'use client';

import { addDaysISO, formatDayLong, getLiturgicalDay, parseISODate, READING_TITLES, toISODate, type ISODate } from '@catalysis/api';
import { LECTIONARY_RANGE } from '@catalysis/lectionary';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { readingId, ReadingView } from '@/components/readings';
import { Page } from '@/components/shell';
import { Card, Chip, CircleButton, EmptyState, Ico, PageTitle, Pill, Skeleton, SkeletonLines } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { readingsHref, useDayReadings } from '@/lib/readings';

/** A real date. One outside the data's range is shown with a link to the USCCB. */
const valid = (value: string | null): value is ISODate =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().startsWith(value));

function Readings() {
  const router = useRouter();
  const { today } = useToday();
  const asked = useSearchParams().get('date');
  const date: ISODate = valid(asked) ? asked : today;
  const day = getLiturgicalDay(date);
  const { result, retry } = useDayReadings(date);
  const go = (next: ISODate) => router.replace(readingsHref(next === toISODate(new Date()) ? undefined : next), { scroll: false });
  const ready = result?.status === 'ready' ? result.day : undefined;
  const gospel = ready?.readings.find((r) => r.kind === 'gospel');
  const usccb = ready?.usccb ?? (result && result.status !== 'ready' ? result.usccb : undefined);
  const before = addDaysISO(date, -1);
  const after = addDaysISO(date, 1);

  return (
    <Page>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle accent="at Mass">Readings</PageTitle>
        <div className="flex items-center gap-2">
          <CircleButton icon={ChevronLeft} label="The day before" disabled={before < LECTIONARY_RANGE.first} onClick={() => go(before)} />
          <span className="gs min-w-0 truncate text-center text-[15px] font-semibold text-ink">{formatDayLong(parseISODate(date), false)}</span>
          <CircleButton icon={ChevronRight} label="The day after" disabled={after > LECTIONARY_RANGE.last} onClick={() => go(after)} />
          {date !== today ? <Pill variant="inset" onClick={() => go(today)} className="px-[14px] py-2 text-[13px]">Today</Pill> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card as="article" aria-label="Readings at Mass" className="min-w-0 p-6 md:p-10 lg:col-span-8">
          <span className="mn text-muted">{day.season}</span>
          <h2 className="bq mt-2 text-[28px] leading-[1.05] font-bold tracking-[-.03em] text-ink md:text-[36px]">{day.celebration}</h2>

          <div className="mt-8">
            {!result ? (
              <div role="status" aria-label="Loading">
                <Skeleton className="mb-5 h-3 w-28" />
                <SkeletonLines lines={7} />
                <Skeleton className="mt-10 mb-5 h-3 w-36" />
                <SkeletonLines lines={5} />
              </div>
            ) : result.status !== 'ready' ? (
              <div role="alert">
                <EmptyState>
                  {result.status === 'none' ? 'The app doesn’t have the readings for this day yet.' : 'The readings couldn’t be loaded just now.'}
                </EmptyState>
                <div className="mt-5 flex flex-wrap gap-[10px]">
                  {result.status === 'error' ? <Pill onClick={retry} className="px-[20px] py-[11px] text-[14px]">Try again</Pill> : null}
                  <Pill href={result.usccb} target="_blank" rel="noopener noreferrer" variant="ghost" iconAfter={ExternalLink} className="px-[18px] py-[11px] text-[14px]">
                    Readings on the USCCB’s site
                  </Pill>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {result.day.readings.map((reading) => <ReadingView key={reading.kind} reading={reading} usccb={result.day.usccb} />)}
              </div>
            )}
          </div>
        </Card>

        <aside aria-label="About these readings" className="flex flex-col gap-4 lg:col-span-4 lg:sticky lg:top-[84px] lg:self-start">
          {ready ? (
            <Card className="p-[22px]">
              <h2 className="mn text-muted">{date === today ? 'Today’s readings' : 'The readings'}</h2>
              <ul className="gs mt-3 flex flex-col gap-1">
                {ready.readings.map((r) => (
                  <li key={r.kind}>
                    <a href={`#${readingId(r.kind)}`} className="hover-inset flex items-baseline justify-between gap-3 rounded-[12px] px-3 py-2">
                      <span className="shrink-0 text-[15px] text-ink">{READING_TITLES[r.kind]}</span>
                      <span className="truncate text-[12px] text-subtle">{r.citation}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {gospel ? (
            <Card surface="a3" className="p-[22px]">
              <div className="mn">Pray with the Gospel</div>
              <p className="gs mt-2 text-[14px] leading-[1.5]">Ask Lumen to open up the Gospel, with the Church’s reading of it.</p>
              <Pill
                href={`/lumen?q=${encodeURIComponent(`Help me pray with the Gospel for ${formatDayLong(parseISODate(date), false)}, ${gospel.citation}.`)}`}
                variant="dark"
                icon={Sparkles}
                className="mt-4 px-[18px] py-[11px] text-[14px]"
              >
                Ask Lumen
              </Pill>
            </Card>
          ) : null}
          <Card surface="inset" className="p-[22px]">
            <Chip tone="a3">Source</Chip>
            <p className="gs mt-3 text-[13px] leading-[1.5] text-muted">
              The readings appointed by the Lectionary for Mass for the dioceses of the United States, in the text of the New American Bible, Revised Edition, as in the Bible tab. Partial verses are shown whole. The Lectionary’s own wording, the psalm’s refrain and the Gospel acclamation are on the USCCB’s page.
            </p>
            {usccb ? (
              <a href={usccb} target="_blank" rel="noopener noreferrer" className="gs hover-dim mt-3 inline-flex items-center gap-[6px] text-[13px] font-semibold text-ink underline underline-offset-2">
                This day on the USCCB’s site
                <Ico icon={ExternalLink} size={12} />
              </a>
            ) : null}
          </Card>
        </aside>
      </div>
    </Page>
  );
}

export default function ReadingsPage() {
  return (
    <Suspense fallback={<Page><Skeleton className="h-[480px] rounded-[28px]" /></Page>}>
      <Readings />
    </Suspense>
  );
}
