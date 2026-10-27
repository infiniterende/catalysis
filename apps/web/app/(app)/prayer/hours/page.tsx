'use client';

import {
  addDaysISO, currentHour, formatDayLong, getLiturgicalDay, hourInfo, HOURS, isHourId, parseISODate, sourceMissesCelebration,
  toISODate, type HourId, type ISODate,
} from '@catalysis/api';
import { ChevronLeft, ChevronRight, ExternalLink, Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { HourBody, sectionId } from '@/components/hours';
import { BackLink, Page } from '@/components/shell';
import { Card, Chip, CircleButton, cx, EmptyState, Ico, PageTitle, Pill, Skeleton, SkeletonLines } from '@/components/ui';
import { hoursHref, useHour } from '@/lib/hours';
import { useToday } from '@/lib/hooks';

const PAST_DAYS = 31;
const FUTURE_DAYS = 92;

const daysBetween = (a: ISODate, b: ISODate) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);

function DateBar({ date, today, onChange }: { date: ISODate; today: ISODate; onChange: (date: ISODate) => void }) {
  const offset = daysBetween(today, date);
  return (
    <div className="flex items-center gap-2">
      <CircleButton icon={ChevronLeft} label="The day before" disabled={offset <= -PAST_DAYS} onClick={() => onChange(addDaysISO(date, -1))} />
      <span className="gs min-w-0 truncate text-center text-[15px] font-semibold text-ink">{formatDayLong(parseISODate(date), false)}</span>
      <CircleButton icon={ChevronRight} label="The day after" disabled={offset >= FUTURE_DAYS} onClick={() => onChange(addDaysISO(date, 1))} />
      {date !== today ? <Pill variant="inset" onClick={() => onChange(today)} className="px-[14px] py-2 text-[13px]">Today</Pill> : null}
    </div>
  );
}

function HourTabs({ hour, onChange }: { hour: HourId; onChange: (hour: HourId) => void }) {
  return (
    <div role="tablist" aria-label="Hours" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {HOURS.map((info) => {
        const on = info.id === hour;
        return (
          <button
            key={info.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(info.id)}
            className={cx('gs shrink-0 rounded-full px-4 py-[10px] text-[14px] font-semibold whitespace-nowrap', on ? 'bg-btn text-btn-text' : 'hover-dim bg-inset text-ink')}
          >
            {info.title}
          </button>
        );
      })}
    </div>
  );
}

function Hours() {
  const router = useRouter();
  const params = useSearchParams();
  const { now, today } = useToday();
  const asked = params.get('date');
  const date: ISODate = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && Math.abs(daysBetween(today, asked)) <= FUTURE_DAYS ? asked : today;
  const askedHour = params.get('hour');
  const hour: HourId = isHourId(askedHour) ? askedHour : currentHour(now);
  const info = hourInfo(hour);
  const { result, retry } = useHour(date, hour);
  const day = getLiturgicalDay(date);

  const go = (next: { date?: ISODate; hour?: HourId }) => {
    const nextDate = next.date ?? date;
    router.replace(hoursHref(next.hour ?? hour, nextDate === toISODate(new Date()) ? undefined : nextDate), { scroll: false });
  };

  const text = result?.status === 'ready' ? result.text : undefined;
  const missing = text ? sourceMissesCelebration(day, text.day) : false;

  return (
    <Page>
      <BackLink href="/prayer">Prayer</BackLink>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle accent={info.title.toLowerCase()}>Liturgy of the Hours</PageTitle>
        <DateBar date={date} today={today} onChange={(d) => go({ date: d })} />
      </div>
      <HourTabs hour={hour} onChange={(h) => go({ hour: h })} />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card as="article" aria-label={info.title} className="min-w-0 p-6 md:p-10 lg:col-span-8">
          <div className="mb-8">
            <span className="mn text-muted">{day.season}</span>
            <h2 className="bq mt-2 text-[28px] leading-[1.05] font-bold tracking-[-.03em] text-ink md:text-[36px]">{day.celebration}</h2>
            {text && text.day && text.day !== day.celebration && !missing ? <p className="gs mt-2 text-[14px] text-muted">{text.day}</p> : null}
          </div>

          {missing && text ? (
            <div role="note" className="mb-8 flex gap-3 rounded-[18px] bg-a6 px-[18px] py-4 text-on-a">
              <Ico icon={Info} size={18} className="mt-[2px]" />
              <p className="gs text-[14px] leading-[1.5]">
                Today is the {day.rank} of <strong>{day.shortName}</strong>, which has its own proper texts. The Office below is iBreviary’s for{' '}
                <strong>{text.day}</strong>; its hymn, antiphons, readings and prayer may differ from today’s. A printed breviary or the iBreviary app has the proper Office.
              </p>
            </div>
          ) : null}

          {!result ? (
            <div role="status" aria-label="Loading">
              <Skeleton className="mb-6 h-3 w-28" />
              <SkeletonLines lines={6} />
              <Skeleton className="mt-10 mb-6 h-3 w-24" />
              <SkeletonLines lines={8} />
            </div>
          ) : result.status === 'error' ? (
            <div role="alert">
              <EmptyState>{result.message}</EmptyState>
              <div className="mt-5 flex flex-wrap gap-[10px]">
                <Pill onClick={retry} className="px-[20px] py-[11px] text-[14px]">Try again</Pill>
                {result.link ? (
                  <Pill href={result.link} target="_blank" rel="noopener noreferrer" variant="ghost" iconAfter={ExternalLink} className="px-[18px] py-[11px] text-[14px]">
                    Open iBreviary
                  </Pill>
                ) : null}
              </div>
            </div>
          ) : (
            <HourBody text={result.text} />
          )}
        </Card>

        <aside aria-label="About this hour" className="flex flex-col gap-4 lg:col-span-4 lg:sticky lg:top-[84px] lg:self-start">
          {text ? (
            <Card className="p-[22px]">
              <h2 className="mn text-muted">In this hour</h2>
              <ul className="gs mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {text.sections.map((section, i) =>
                  section.title ? (
                    <li key={i}>
                      <a href={`#${sectionId(i)}`} className="hover-inset block rounded-full bg-inset px-3 py-[7px] text-[13px] font-medium text-ink lg:rounded-[12px] lg:bg-transparent lg:px-3 lg:py-2 lg:text-[15px]">
                        {section.title}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </Card>
          ) : null}
          <Card surface="inset" className="p-[22px]">
            <Chip tone="a3">Source</Chip>
            <p className="gs mt-3 text-[13px] leading-[1.5] text-muted">
              {text?.notice ?? 'Texts of the Liturgy of the Hours as published by iBreviary.'}
            </p>
            <a
              href="https://www.ibreviary.com"
              target="_blank"
              rel="noopener noreferrer"
              className="gs hover-dim mt-3 inline-flex items-center gap-[6px] text-[13px] font-semibold text-ink underline underline-offset-2"
            >
              iBreviary
              <Ico icon={ExternalLink} size={12} />
            </a>
          </Card>
        </aside>
      </div>
    </Page>
  );
}

export default function HoursPage() {
  return (
    <Suspense fallback={<Page><Skeleton className="h-[480px] rounded-[28px]" /></Page>}>
      <Hours />
    </Suspense>
  );
}
