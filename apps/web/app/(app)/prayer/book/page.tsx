'use client';

import { PRAYER_BOOK, rosaryFor, searchPrayerBook, WEEKDAYS, parseISODate, type GuidedPrayer, type Tone } from '@catalysis/api';
import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { prayerHref, stepCount } from '@/components/prayer-book';
import { BackLink, Page } from '@/components/shell';
import { Card, CardTitle, cx, EmptyState, Ico, PageTitle, TONE_BG } from '@/components/ui';
import { useToday } from '@/lib/hooks';

function PrayerCard({ prayer, tone }: { prayer: GuidedPrayer; tone: Tone }) {
  return (
    <li>
      <Link
        href={prayerHref(prayer.id)}
        className={cx('hover-lift flex h-full min-h-[150px] flex-col justify-between gap-5 rounded-[24px] p-5 text-on-a', TONE_BG[tone])}
      >
        <span className="mn">{prayer.minutes} min · {stepCount(prayer.steps)}</span>
        <span>
          <span className="bq block text-[22px] leading-[1.08] font-bold tracking-[-.03em]">{prayer.title}</span>
          {prayer.summary ? <span className="gs mt-[6px] block text-[14px] leading-[1.35]">{prayer.summary}</span> : null}
        </span>
      </Link>
    </li>
  );
}

function Results({ query }: { query: string }) {
  const hits = searchPrayerBook(query);
  if (hits.length === 0) return <EmptyState className="mt-6">No prayer matches “{query.trim()}”.</EmptyState>;
  return (
    <ul className="mt-6 flex flex-col gap-[10px]" aria-label="Matching prayers">
      {hits.map((prayer) => (
        <li key={prayer.id}>
          <Link href={prayerHref(prayer.id)} className="hover-dim flex items-center gap-4 rounded-[18px] bg-inset px-[18px] py-[14px]">
            <span className="min-w-0 flex-1">
              <span className="bq block truncate text-[18px] font-bold tracking-[-.02em] text-ink">{prayer.title}</span>
              {prayer.summary ? <span className="gs mt-[2px] block truncate text-[13px] text-muted">{prayer.summary}</span> : null}
            </span>
            <Ico icon={ArrowRight} size={16} className="text-subtle" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PrayerBookPage() {
  const { today } = useToday();
  const [query, setQuery] = useState('');
  const rosary = rosaryFor(today);
  const weekday = WEEKDAYS[parseISODate(today).getDay()];

  return (
    <Page>
      <BackLink href="/prayer">Prayer</BackLink>
      <div className="mb-[22px] flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle accent="pray with the Church">Prayer book</PageTitle>
        <label className="flex items-center gap-[10px] rounded-full bg-inset px-[18px] md:w-[320px]">
          <Ico icon={Search} size={16} className="text-subtle" />
          <span className="sr-only">Search the prayer book</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prayers"
            className="gs min-w-0 flex-1 py-[13px] text-[15px] text-ink"
          />
        </label>
      </div>

      {query.trim() ? (
        <Results query={query} />
      ) : (
        <>
          <Link href={prayerHref(rosary.id)} className="hover-lift mb-8 block">
            <Card surface="solid" className="flex flex-col gap-5 p-[26px] md:flex-row md:items-end md:justify-between">
              <div>
                <span className="gs inline-flex rounded-full bg-a2 px-[13px] py-[7px] text-[13px] font-bold text-on-a">{weekday}’s Rosary</span>
                <h2 className="bq mt-4 text-[36px] leading-none font-bold tracking-[-.035em] text-white md:text-[44px]">{rosary.title}</h2>
                <p className="gs mt-3 text-[15px] text-on-solid-muted">Five decades, with a passage for each mystery. About {rosary.minutes} minutes.</p>
              </div>
              <span className="gs inline-flex items-center gap-2 self-start rounded-full bg-white px-[20px] py-[12px] text-[15px] font-semibold text-on-a md:self-auto">
                Open
                <Ico icon={ArrowRight} size={16} />
              </span>
            </Card>
          </Link>

          <div className="flex flex-col gap-10">
            {PRAYER_BOOK.map((section) => (
              <section key={section.id} aria-labelledby={`section-${section.id}`}>
                <div className="mb-4">
                  <CardTitle className="text-[28px] text-ink">
                    <span id={`section-${section.id}`}>{section.title}</span>
                  </CardTitle>
                  <p className="gs mt-[6px] text-[15px] text-muted">{section.description}</p>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.prayers.map((prayer) => <PrayerCard key={prayer.id} prayer={prayer} tone={section.tone} />)}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
