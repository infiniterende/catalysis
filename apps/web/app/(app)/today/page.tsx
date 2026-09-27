'use client';

import {
  allEvents, bestStreak, buildRule, buildWeek, chapterLabel, compactCount, computeStreak, daysBetween,
  defaultEditionShort, feedReels, fetchChapter, formatTime12, formatTime24, getBook, getLiturgicalDay, goingCount,
  greeting, MONTHS_SHORT, nextEvent, parseISODate, VERSE_OF_THE_DAY, WEEKDAYS_SHORT,
  type CalendarEvent, type ChapterRef,
} from '@catalysis/api';
import { ArrowRight, ArrowUp, Check, Flame, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Page } from '@/components/shell';
import { Card, CardTitle, cx, Ico, Photo, Pill, Progress } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { useApp } from '@/lib/store';

const verseHref = `/scripture/${VERSE_OF_THE_DAY.bookId}/${VERSE_OF_THE_DAY.chapter}`;

function AskLumen() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = question.trim();
    router.push(q ? `/lumen?q=${encodeURIComponent(q)}` : '/lumen');
  };
  return (
    <form onSubmit={submit} className="gs flex w-full items-center gap-[10px] rounded-full border border-line bg-card py-[7px] pr-[7px] pl-5 md:w-[420px]">
      <Ico icon={Sparkles} size={17} className="text-a1" />
      <input
        aria-label="Ask Lumen"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask Lumen about today’s Gospel…"
        maxLength={2000}
        className="min-w-0 flex-1 text-[15px] text-ink"
      />
      <button type="submit" aria-label="Ask Lumen" className="hover-dim flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-btn text-btn-text">
        <Ico icon={ArrowUp} size={17} />
      </button>
    </form>
  );
}

function VerseCard() {
  const [shared, setShared] = useState(false);
  const share = async () => {
    const text = `“${VERSE_OF_THE_DAY.text}” — ${VERSE_OF_THE_DAY.label}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // The share sheet was dismissed.
    }
  };
  return (
    <Card as="section" surface="solid" aria-label="Verse of the day" className="flex min-h-[300px] flex-col justify-between gap-6 p-[26px] md:col-span-2 md:p-[30px] lg:col-span-6">
      <div className="flex justify-between gap-4">
        <span className="mn text-a2">Verse of the day</span>
        <span className="mn text-on-solid-subtle">{VERSE_OF_THE_DAY.label} · {defaultEditionShort()}</span>
      </div>
      <p className="bq text-[34px] leading-[1.05] text-on-solid md:text-[46px]">{VERSE_OF_THE_DAY.text}</p>
      <div className="flex gap-[10px]">
        <Pill href={verseHref} variant="highlight" className="px-5 py-[11px] text-[14px]">Reflect</Pill>
        <Pill variant="onSolid" icon={Share2} iconSize={15} onClick={share} className="px-[18px] py-[10px] text-[14px]">
          {shared ? 'Copied' : 'Share'}
        </Pill>
      </div>
    </Card>
  );
}

function StreakCard() {
  const { today } = useToday();
  const logs = useApp((s) => s.prayerLogs);
  const ruleSize = useApp((s) => s.prayers.length);
  const best = useApp((s) => bestStreak(s));
  const streak = computeStreak(logs, today);
  const week = buildWeek(logs, today, ruleSize);
  return (
    <Card as="section" surface="a2" aria-label="Prayer streak" className="flex min-h-[300px] flex-col justify-between gap-5 p-[26px] lg:col-span-3">
      <div className="flex items-center justify-between">
        <span className="gs text-[15px] font-semibold">Prayer streak</span>
        <Ico icon={Flame} size={22} />
      </div>
      <div>
        <div className="bq text-[120px] leading-[.8] font-extrabold tracking-[-.03em]">{streak}</div>
        <div className="gs mt-[10px] text-[14px]">{streak === 1 ? 'day' : 'days'} · best is {Math.max(best, streak)}</div>
      </div>
      <div className="flex gap-[6px]" role="list" aria-label="This week">
        {week.map((day) => (
          <div key={day.date} role="listitem" aria-label={`${day.short}: ${day.state === 'done' ? 'kept' : day.state}`} className="flex-1 text-center">
            <div
              className={cx(
                'h-[26px] rounded-[8px]',
                day.state === 'done' && 'bg-on-a',
                day.state === 'today' && 'border-2 border-on-a bg-white',
                (day.state === 'future' || day.state === 'missed') && 'bg-[rgba(18,18,18,.14)]',
              )}
            />
            <div className={cx('mn mt-[5px] text-[9px]', day.state === 'today' && 'font-bold')}>{day.letter}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function inDays(today: string, date: string): string {
  const days = daysBetween(parseISODate(today), parseISODate(date));
  if (days <= 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

function NextUpCard({ event, today }: { event: CalendarEvent; today: string }) {
  const going = useApp((s) => s.rsvpEventIds.includes(event.id));
  const count = useApp((s) => goingCount(s, event));
  const toggleRsvp = useApp((s) => s.toggleRsvp);
  const date = parseISODate(event.date);
  return (
    <Card as="section" surface="a4" aria-label="Next up" className="flex min-h-[300px] flex-col justify-between gap-5 p-[26px] lg:col-span-3">
      <div className="flex items-center justify-between">
        <span className="gs text-[15px] font-semibold">Next up</span>
        <span className="mn">{inDays(today, event.date)}</span>
      </div>
      <Link href={`/events?date=${event.date}`} className="hover-dim block">
        <div className="bq text-[52px] leading-[.9] font-bold tracking-[-.03em]">{WEEKDAYS_SHORT[date.getDay()]} {date.getDate()}</div>
        <div className="gs mt-3 text-[18px] font-semibold">{event.title}</div>
        <div className="gs mt-[3px] text-[14px] text-on-am">{formatTime12(event.time)} · {event.location}</div>
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center">
          <span aria-hidden className="h-7 w-7 rounded-full border-2 border-a4 bg-a3" />
          <span aria-hidden className="-ml-2 h-7 w-7 rounded-full border-2 border-a4 bg-a5" />
          <span aria-hidden className="-ml-2 h-7 w-7 rounded-full border-2 border-a4 bg-a2" />
          <span className="gs ml-2 text-[13px] font-semibold">{count} going</span>
        </div>
        <Pill variant="dark" aria-pressed={going} icon={going ? Check : undefined} iconSize={14} onClick={() => toggleRsvp(event.id)} className="px-[15px] py-[9px] text-[13px]">
          {going ? 'Going' : 'RSVP'}
        </Pill>
      </div>
    </Card>
  );
}

function PrayersCard() {
  const { today } = useToday();
  const prayers = useApp((s) => s.prayers);
  const logs = useApp((s) => s.prayerLogs);
  const togglePrayer = useApp((s) => s.togglePrayer);
  const rows = buildRule(prayers, logs, today);
  const done = rows.filter((r) => r.done).length;
  return (
    <Card as="section" aria-label="Today’s prayers" className="min-h-[326px] p-[26px] lg:col-span-4">
      <div className="flex items-baseline justify-between">
        <CardTitle>Today’s prayers</CardTitle>
        <span className="gs text-[15px] font-bold text-ink">{done}/{rows.length}</span>
      </div>
      <Progress value={rows.length ? done / rows.length : 0} label="Prayers completed today" className="mt-[14px]" />
      <ul className="gs mt-4 flex flex-col gap-[6px]">
        {rows.map((row) => (
          <li key={row.prayer.id} className={cx('flex items-center gap-3 py-[9px]', row.next && '-mx-3 rounded-[14px] bg-inset px-3')}>
            <button
              type="button"
              role="checkbox"
              aria-checked={row.done}
              aria-label={row.prayer.title}
              onClick={() => togglePrayer(row.prayer.id)}
              className={cx(
                'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full after:absolute after:-inset-2',
                row.done ? 'bg-btn text-btn-text' : 'border-2 border-ink',
              )}
            >
              {row.done ? <Ico icon={Check} size={13} /> : null}
            </button>
            <span className={cx('flex-1 text-[15px]', row.done ? 'text-subtle line-through' : row.next ? 'font-semibold text-ink' : 'text-ink')}>
              {row.prayer.shortTitle ?? row.prayer.title}
            </span>
            {row.next && row.prayer.guidedContentId ? (
              <Pill href={`/prayer/guided/${row.prayer.guidedContentId}`} variant="accent" className="px-3 py-[6px] text-[13px]">Start</Pill>
            ) : (
              <span className="text-[13px] text-subtle">{formatTime24(row.log ? new Date(row.log.completedAt) : row.prayer.scheduledTime)}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The first lines of a chapter, for the reading card. */
function useOpening(ref: ChapterRef): string {
  const [opening, setOpening] = useState<{ key: string; text: string }>({ key: '', text: '' });
  const key = `${ref.bookId}/${ref.chapter}`;
  useEffect(() => {
    let live = true;
    fetchChapter({ bookId: ref.bookId, chapter: ref.chapter })
      .then((chapter) => {
        const text = chapter.verses.slice(0, 2).map((v) => v.text).join(' ');
        if (live) setOpening({ key, text: text.length > 150 ? `${text.slice(0, text.lastIndexOf(' ', 150))}…` : text });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key, ref.bookId, ref.chapter]);
  return opening.key === key ? opening.text : '';
}

function ReadingCard() {
  const reading = useApp((s) => s.reading);
  const book = getBook(reading.bookId);
  const opening = useOpening(reading);
  // Progress through the book, counting the chapter being read.
  const progress = book ? reading.chapter / book.chapters : 0;
  return (
    <Card as="section" aria-label="Keep reading" className="flex min-h-[326px] flex-col p-[26px] lg:col-span-4">
      <div className="flex items-baseline justify-between gap-3">
        <CardTitle>Keep reading</CardTitle>
        <span className="mn text-muted">{Math.round(progress * 100)}% of {book?.name ?? 'the book'}</span>
      </div>
      <div className="bq mt-[18px] text-[44px] leading-none font-bold tracking-[-.03em] text-ink">{chapterLabel(reading)}</div>
      <p className="nr mt-[10px] mb-5 min-h-[52px] text-[17px] leading-[1.55] text-muted">{opening}</p>
      <Progress value={progress} tone="btn" label={`Progress through ${book?.name ?? 'the book'}`} className="mt-auto" />
      <Pill href={`/scripture/${reading.bookId}/${reading.chapter}`} iconAfter={ArrowRight} className="mt-4 self-start px-[18px] py-[11px] text-[14px]">
        Continue
      </Pill>
    </Card>
  );
}

function ReelsCard() {
  const reels = useApp((s) => feedReels(s, 'forYou'));
  const top = [...reels].filter((r) => r.media).sort((a, b) => b.likeCount - a.likeCount).slice(0, 3);
  return (
    <Card as="section" surface="solid" aria-label="Trending reels" className="flex min-h-[326px] flex-col p-[22px] md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between px-1 pt-1">
        <CardTitle className="text-white">Trending reels</CardTitle>
        <Link href="/reels" className="gs hover-dim text-[13px] font-semibold text-a2">See all</Link>
      </div>
      <div className="mt-4 grid min-h-[220px] flex-1 grid-cols-3 gap-2">
        {top.map((reel) => (
          <Link key={reel.id} href={`/reels?reel=${reel.id}`} aria-label={`${reel.title} by ${reel.authorName}`} className="hover-lift block">
            <Photo media={reel.media} className="h-full rounded-[16px]">
              <span className="gs absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">{compactCount(reel.likeCount)}</span>
            </Photo>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { now, today } = useToday();
  const name = useApp((s) => s.user?.name ?? '');
  const day = getLiturgicalDay(today);
  const next = nextEvent(allEvents(), today);
  const first = name.split(' ')[0] || 'friend';

  return (
    <Page>
      <div className="mb-[22px] flex flex-col gap-5 pt-1 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mn text-muted">
            {WEEKDAYS_SHORT[now.getDay()]}, {MONTHS_SHORT[now.getMonth()]} {now.getDate()} · {day.shortName}
          </div>
          <h1 className="bq mt-2 text-[38px] leading-none font-bold tracking-[-.03em] text-ink md:text-[52px]">
            {greeting(now)}, <span className="tracking-[-.01em]">{first}</span>
          </h1>
        </div>
        <AskLumen />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <VerseCard />
        <StreakCard />
        {next ? <NextUpCard event={next} today={today} /> : null}
        <PrayersCard />
        <ReadingCard />
        <ReelsCard />
      </div>
    </Page>
  );
}
