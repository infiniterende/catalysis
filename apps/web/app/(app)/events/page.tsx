'use client';

import {
  allEvents, buildMonthGrid, eventsInMonth, eventsOn, formatDayLong, formatTime12, getLiturgicalDay, goingCount,
  isFeastDay, MONTHS, MONTHS_SHORT, nextEvent, parseISODate, shiftMonth, splitTime12, toICS, WEEKDAYS_SHORT,
  type CalendarEvent, type ISODate, type LiturgicalDay, type MonthCell,
} from '@catalysis/api';
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Page } from '@/components/shell';
import {
  Card, CircleButton, cx, EmptyState, Ico, Photo, Pill, Segmented, Sheet, SheetAction, Skeleton, TONE_BG,
  type SegmentItem,
} from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { useApp } from '@/lib/store';

const EVENTS = allEvents();
const ISO = /^\d{4}-\d{2}-\d{2}$/;

type View = 'month' | 'list';
const VIEWS: SegmentItem<View>[] = [
  { id: 'month', label: 'Month' },
  { id: 'list', label: 'List' },
];

const toneOf = (event: CalendarEvent) => TONE_BG[event.tone ?? 'a3'];

/** `Tue, Sept 29` */
function shortDate(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

function downloadICS(event: CalendarEvent) {
  const url = URL.createObjectURL(new Blob([toICS(event)], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- event card ---------- */

function EventCard({
  event, showDate, surface = 'card', heading: Heading = 'h3',
}: { event: CalendarEvent; showDate?: boolean; surface?: 'card' | 'inset'; heading?: 'h2' | 'h3' }) {
  const going = useApp((s) => s.rsvpEventIds.includes(event.id));
  const count = useApp((s) => goingCount(s, event));
  const toggleRsvp = useApp((s) => s.toggleRsvp);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const time = splitTime12(event.time);
  const date = parseISODate(event.date);

  const share = async () => {
    const text = `${event.title} — ${formatDayLong(date, false)}, ${formatTime12(event.time)} at ${event.location}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice('Copied to the clipboard.');
      }
    } catch {
      // The share sheet was dismissed.
    }
  };

  return (
    <li className={cx('flex shrink-0 items-center gap-[14px] rounded-[24px] p-[18px]', surface === 'card' ? 'border border-line bg-card' : 'bg-inset')}>
      {/* The button's ::after stretches over the tile and the text, so the whole area opens the details. */}
      <div className="hover-dim relative flex min-w-0 flex-1 items-center gap-[14px]">
        <div aria-hidden className={cx('flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[16px] text-on-a', toneOf(event))}>
          <span className="bq text-[20px] leading-none font-bold">{time.clock}</span>
          <span className="mn text-[9px]">{time.meridiem}</span>
        </div>
        <div className="gs min-w-0 flex-1">
          <Heading className="text-[16px] font-semibold text-ink">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`${event.title}, ${formatTime12(event.time)}. Details`}
              onClick={() => setOpen(true)}
              className="text-left after:absolute after:inset-0"
            >
              {event.title}
            </button>
          </Heading>
          <p className="mt-[2px] text-[13px] text-muted">
            {showDate ? `${shortDate(date)} · ` : ''}{event.location} · {count} going
          </p>
        </div>
      </div>
      <Pill
        variant={going ? 'highlight' : 'primary'}
        icon={going ? Check : undefined}
        iconSize={14}
        aria-pressed={going}
        onClick={() => toggleRsvp(event.id)}
        className={cx('shrink-0 text-[13px]', going ? 'px-[13px] py-[9px]' : 'px-4 py-[10px]')}
      >
        {going ? 'Going' : 'RSVP'}
      </Pill>
      <Sheet open={open} onClose={() => setOpen(false)} title={event.title}>
        <p className="gs text-[15px] leading-[1.55] text-muted">
          {formatDayLong(date)}, {formatTime12(event.time)}
          <br />
          {event.location} · {count} going
        </p>
        <div className="mt-4">
          <SheetAction icon={Check} onClick={() => toggleRsvp(event.id)}>{going ? 'Cancel my RSVP' : 'RSVP — I’m going'}</SheetAction>
          <SheetAction icon={CalendarPlus} onClick={() => downloadICS(event)}>Add to calendar</SheetAction>
          <SheetAction icon={Share2} onClick={share}>Share</SheetAction>
        </div>
        {notice ? <p role="status" className="gs mt-3 text-[14px] text-muted">{notice}</p> : null}
      </Sheet>
    </li>
  );
}

/* ---------- calendar grid ---------- */

// Cells carry a 2px border (transparent unless it is today), so padding is the design's less 2px.
const CELL = 'gs min-h-[52px] rounded-[14px] border-2 p-1 text-[14px] font-semibold md:min-h-[92px] md:p-2 lg:p-[5px] xl:p-2';

function DayCell({ cell, today, selected, onSelect }: { cell: MonthCell; today: ISODate; selected: boolean; onSelect: (d: ISODate) => void }) {
  if (!cell.inMonth) return <div aria-hidden className={cx(CELL, 'border-transparent text-faint')}>{cell.day}</div>;

  const day = getLiturgicalDay(cell.date);
  const feast = isFeastDay(day);
  const events = eventsOn(EVENTS, cell.date);
  const isToday = cell.date === today;
  const chips = events.slice(0, 2);
  const more = events.length - chips.length;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={`${formatDayLong(parseISODate(cell.date))}${isToday ? ', today' : ''}${feast ? `, ${day.shortName}` : ''}${events.length ? `, ${events.length} ${events.length === 1 ? 'event' : 'events'}` : ''}`}
      onClick={() => onSelect(cell.date)}
      className={cx(
        CELL,
        'hover-dim flex min-w-0 flex-col items-stretch justify-start overflow-hidden text-left -outline-offset-2',
        selected ? 'border-transparent bg-btn text-btn-text' : isToday ? 'border-ink text-ink' : 'border-transparent bg-inset text-ink',
      )}
    >
      <span>{cell.day}</span>
      {feast ? (
        <span className={cx('bq mt-1 hidden text-[14px] leading-[1.1] font-normal [overflow-wrap:anywhere] md:block lg:text-[12px] xl:text-[14px]', selected ? 'text-btn-text' : 'text-a1')}>
          {day.shortName}
        </span>
      ) : null}
      {selected
        ? null
        : chips.map((event, i) => (
            <span key={event.id} className={cx('hidden truncate rounded-[7px] px-[7px] py-1 text-[11px] font-semibold text-on-a md:block', i === 0 ? 'mt-[6px]' : 'mt-1', toneOf(event))}>
              {event.shortTitle ?? event.title}
            </span>
          ))}
      {!selected && more > 0 ? <span className="mt-1 hidden text-[11px] font-semibold text-muted md:block">+{more}</span> : null}
      {feast || events.length > 0 ? (
        // Dots: always on the selected day; on the others only where the cell is too small for names.
        <span className={cx('mt-[6px] flex flex-wrap gap-1', !selected && 'md:hidden')}>
          {feast ? <span className="h-[6px] w-[6px] rounded-full bg-a1 md:hidden" /> : null}
          {events.map((event) => (
            <span key={event.id} className={cx('h-[6px] w-[6px] rounded-full md:h-2 md:w-2', toneOf(event))} />
          ))}
        </span>
      ) : null}
      {isToday && !selected && !feast && events.length === 0 ? <span className="mn mt-[6px] hidden text-[9px] text-muted md:block">Today</span> : null}
    </button>
  );
}

/* ---------- selected day ---------- */

/** Splits "Feast of the Archangels" into its plain lead and the accented name. */
function feastTitle(day: LiturgicalDay): { lead: string; name: string } | undefined {
  const prefix = ['Feast of ', 'Solemnity of '].find((p) => day.celebration.startsWith(p));
  if (!prefix) return undefined;
  const rest = day.celebration.slice(prefix.length);
  const name = day.shortName.length < rest.length ? day.shortName : rest;
  const article = /^the /i.test(name);
  return { lead: article ? `${prefix}the ` : prefix, name: article ? name.slice(4) : name };
}

function DayHeader({ date, day }: { date: Date; day: LiturgicalDay }) {
  const feast = isFeastDay(day);
  const title = feast ? feastTitle(day) : undefined;
  const content = (
    <>
      <span className="gs relative self-start rounded-full bg-white px-3 py-[6px] text-[13px] font-bold text-on-a">{shortDate(date)}</span>
      <h2 className="bq relative px-1 pb-[2px] text-[30px] leading-none font-bold tracking-[-.04em] text-white">
        {title ? (
          <>
            {title.lead}
            <span className="tracking-normal">{title.name}</span>
          </>
        ) : (
          day.celebration
        )}
      </h2>
    </>
  );
  const layout = 'flex shrink-0 flex-col justify-between gap-6 rounded-[28px] p-[18px]';
  if (!feast) return <div className={cx(layout, 'min-h-[150px] bg-solid')}>{content}</div>;
  return (
    <Photo
      media={{ kind: 'image', asset: 'angel', focus: '50% 35%' }}
      scrim="linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.82))"
      className={cx(layout, 'min-h-[230px]')}
    >
      {content}
    </Photo>
  );
}

function ComingUp({ month, events }: { month: string; events: CalendarEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="rounded-[24px] bg-inset p-5 lg:flex-1">
      <h2 className="mn text-muted">Coming in {month}</h2>
      <ul className="gs mt-[10px] flex flex-col gap-1">
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/events?date=${event.date}`} scroll={false} className="hover-dim flex min-h-[40px] items-center gap-3">
              <span className="bq w-10 shrink-0 text-[24px] leading-none font-bold text-a1">{String(parseISODate(event.date).getDate()).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 text-[15px] text-ink">{event.title}</span>
              <Ico icon={ChevronRight} size={17} className="text-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- page ---------- */

function Calendar() {
  const router = useRouter();
  const params = useSearchParams();
  const { today } = useToday();

  const asked = params.get('date');
  const fallback = nextEvent(EVENTS, today)?.date ?? today;
  const selected: ISODate = asked && ISO.test(asked) ? asked : fallback;
  const selectedDate = parseISODate(selected);

  const [view, setView] = useState<View>('month');
  const [shown, setShown] = useState<{ anchor: ISODate; year: number; month: number } | null>(null);
  // The visible month follows the selected day until the arrows move it.
  const month = shown?.anchor === selected ? shown : { anchor: selected, year: selectedDate.getFullYear(), month: selectedDate.getMonth() };

  const select = (date: ISODate) => router.replace(`/events?date=${date}`, { scroll: false });
  const move = (delta: number) => setShown({ anchor: selected, ...shiftMonth(month.year, month.month, delta) });

  const weeks = buildMonthGrid(month.year, month.month);
  const monthEvents = eventsInMonth(EVENTS, month.year, month.month);
  const following = shiftMonth(month.year, month.month, 1);
  const comingNext = eventsInMonth(EVENTS, following.year, following.month).slice(0, 4);
  const dayEvents = eventsOn(EVENTS, selected);

  return (
    <Page fill>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card as="section" aria-label="Calendar" className="flex min-w-0 flex-col p-4 md:p-[26px] lg:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <h1 className="bq text-[34px] leading-none font-bold tracking-[-.035em] text-ink md:text-[52px] lg:text-[40px] xl:text-[52px]" aria-live="polite">
              {MONTHS[month.month]} <span className="tracking-normal text-subtle">{month.year}</span>
            </h1>
            <div className="flex items-center gap-2">
              <Segmented items={VIEWS} value={view} onChange={setView} label="Calendar view" />
              <CircleButton icon={ChevronLeft} label="Previous month" variant="inset" size={38} onClick={() => move(-1)} />
              <CircleButton icon={ChevronRight} label="Next month" variant="inset" size={38} onClick={() => move(1)} />
            </div>
          </div>

          {view === 'month' ? (
            <>
              <div aria-hidden className="mn mt-5 grid grid-cols-7 gap-[6px] text-[10px] text-muted">
                {WEEKDAYS_SHORT.map((d) => <span key={d} className="pl-[6px] md:pl-[10px]">{d}</span>)}
              </div>
              <div className="mt-2 grid flex-1 auto-rows-fr grid-cols-7 gap-[6px] lg:min-h-0 lg:overflow-y-auto">
                {weeks.flat().map((cell) => (
                  <DayCell key={cell.date} cell={cell} today={today} selected={cell.date === selected} onSelect={select} />
                ))}
              </div>
            </>
          ) : monthEvents.length === 0 ? (
            <EmptyState className="mt-5 rounded-[24px] bg-inset p-5">Nothing is planned for {MONTHS[month.month]} yet.</EmptyState>
          ) : (
            <ul className="mt-5 flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {monthEvents.map((event) => <EventCard key={event.id} event={event} showDate surface="inset" heading="h2" />)}
            </ul>
          )}
        </Card>

        <aside aria-label="Selected day" className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
          <DayHeader date={selectedDate} day={getLiturgicalDay(selected)} />
          {dayEvents.length === 0 ? (
            <EmptyState className="shrink-0 rounded-[24px] bg-inset p-5">No events this day.</EmptyState>
          ) : (
            <ul className="flex shrink-0 flex-col gap-3">
              {dayEvents.map((event) => <EventCard key={event.id} event={event} />)}
            </ul>
          )}
          <ComingUp month={MONTHS[following.month] ?? ''} events={comingNext} />
        </aside>
      </div>
    </Page>
  );
}

function CalendarSkeleton() {
  return (
    <Page fill>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_380px]" role="status" aria-label="Loading">
        <Skeleton className="min-h-[420px] rounded-[28px]" />
        <Skeleton className="min-h-[230px] rounded-[28px]" />
      </div>
    </Page>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <Calendar />
    </Suspense>
  );
}
