'use client';

import {
  bestStreak, buildMonth, buildRule, computeStreak, DEFAULT_PRAYERS, FEATURED_GUIDED_IDS, formatHour, formatTime12,
  formatDayShort, GUIDED_PRAYERS, MONTHS, MONTHS_SHORT, pad2, parseISODate, rosaryFor, TONIGHT,
  type ISODate, type MonthDay, type RuleRow, type Tone,
} from '@catalysis/api';
import { ArrowRight, Bell, BookOpen, BookText, Check, Heart, Moon, NotebookPen, Play, Plus, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { guidedHref, prayerHref } from '@/components/prayer-book';
import { Page } from '@/components/shell';
import { Card, CardTitle, cx, EmptyState, Field, Ico, PageTitle, Photo, Pill, Sheet, TextAction, TONE_BG } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { useApp } from '@/lib/store';

const builtIn = new Set(DEFAULT_PRAYERS.map((p) => p.id));

/* ---------- streak and heatmap ---------- */

function heatClass(day: MonthDay): string {
  if (day.state === 'today') return 'bg-a1 ring-2 ring-on-a';
  if (day.state === 'future') return 'border-[1.5px] border-dashed border-[rgba(18,18,18,.3)]';
  if (day.progress <= 0) return 'bg-[rgba(18,18,18,.12)]';
  if (day.progress <= 0.34) return 'bg-[rgba(18,18,18,.35)]';
  if (day.progress <= 0.74) return 'bg-[rgba(18,18,18,.6)]';
  return 'bg-on-a';
}

function Heatmap({ days, ruleSize }: { days: MonthDay[]; ruleSize: number }) {
  return (
    <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1" role="list" aria-label="Prayers this month">
      {days.map((day) => {
        const month = MONTHS_SHORT[parseISODate(day.date).getMonth()];
        const label =
          day.state === 'future'
            ? `${month} ${day.day}: to come`
            : `${month} ${day.day}: ${Math.round(day.progress * ruleSize)} of ${ruleSize} prayers`;
        return <span key={day.date} role="listitem" title={label} aria-label={label} className={cx('aspect-square rounded-[5px]', heatClass(day))} />;
      })}
    </div>
  );
}

function StreakCard({ today }: { today: ISODate }) {
  const logs = useApp((s) => s.prayerLogs);
  const ruleSize = useApp((s) => s.prayers.length);
  const best = useApp((s) => bestStreak(s));
  const streak = computeStreak(logs, today);
  return (
    <Card as="section" surface="a2" aria-label="Current streak" className="flex min-h-[330px] flex-col justify-between gap-6 p-[26px] lg:col-span-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="gs text-[15px] font-semibold">Current streak</h2>
        <span className="gs rounded-full bg-white/60 px-[11px] py-[5px] text-[13px] font-semibold">Best {Math.max(best, streak)}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="bq text-[120px] leading-[.8] font-extrabold tracking-[-.03em]">{streak}</span>
        <span className="gs pb-[6px] text-[16px] font-semibold">{streak === 1 ? 'day' : 'days'}</span>
      </div>
      <div>
        <div className="mn mb-2">{MONTHS[parseISODate(today).getMonth()]}</div>
        <Heatmap days={buildMonth(logs, today, ruleSize)} ruleSize={ruleSize} />
      </div>
    </Card>
  );
}

/* ---------- today's rule ---------- */

function RuleTime({ row }: { row: RuleRow }) {
  if (row.log) return <span className="text-[13px] text-subtle">{formatTime12(new Date(row.log.completedAt))}</span>;
  if (!row.next) return <span className="text-[13px] text-subtle">{formatTime12(row.prayer.scheduledTime)}</span>;
  const time = formatHour(row.prayer.scheduledTime);
  if (row.prayer.guidedContentId) {
    return (
      <Pill
        href={guidedHref(row.prayer.guidedContentId)}
        variant="accent"
        aria-label={`Begin ${row.prayer.title}, ${time}`}
        className="px-[13px] py-[7px] text-[13px]"
      >
        {time}
      </Pill>
    );
  }
  return <span className="rounded-full bg-a1 px-[13px] py-[7px] text-[13px] font-semibold text-on-a">{time}</span>;
}

function RuleItem({ row }: { row: RuleRow }) {
  const togglePrayer = useApp((s) => s.togglePrayer);
  const removePrayer = useApp((s) => s.removePrayer);
  const custom = !builtIn.has(row.prayer.id);
  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-[16px]',
        row.next ? 'border-2 border-ink px-3 py-[10px]' : 'bg-inset px-[14px] py-3',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={row.done}
        aria-label={row.prayer.title}
        onClick={() => togglePrayer(row.prayer.id)}
        className={cx(
          'relative flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full after:absolute after:-inset-2',
          row.done ? 'bg-btn text-btn-text' : 'border-2 border-ink',
        )}
      >
        {row.done ? <Ico icon={Check} size={14} /> : null}
      </button>
      <span className={cx('min-w-0 flex-1 text-[15px]', row.done ? 'text-subtle line-through' : row.next ? 'font-bold text-ink' : 'text-ink')}>
        {row.prayer.shortTitle ?? row.prayer.title}
      </span>
      {custom && !row.done ? (
        <TextAction onClick={() => removePrayer(row.prayer.id)} className="text-subtle" aria-label={`Remove ${row.prayer.title}`}>
          Remove
        </TextAction>
      ) : null}
      <RuleTime row={row} />
    </li>
  );
}

function TodayCard({ today }: { today: ISODate }) {
  const prayers = useApp((s) => s.prayers);
  const logs = useApp((s) => s.prayerLogs);
  const rows = buildRule(prayers, logs, today);
  const done = rows.filter((r) => r.done).length;
  return (
    <Card as="section" aria-label="Today’s prayers" className="min-h-[330px] p-[26px] lg:col-span-4">
      <div className="flex items-baseline justify-between gap-3">
        <CardTitle>Today</CardTitle>
        <span className="gs text-[15px] font-bold text-ink">{done} of {rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState className="mt-4">Your rule is empty. Add a prayer to begin.</EmptyState>
      ) : (
        <ul className="gs mt-4 flex flex-col gap-2">
          {rows.map((row) => <RuleItem key={row.prayer.id} row={row} />)}
        </ul>
      )}
    </Card>
  );
}

/* ---------- tonight ---------- */

/** Calendar file for tonight's prayer, with an alert ten minutes before. Times are local ("floating"). */
function tonightICS(today: ISODate): string {
  const [hours = 0, minutes = 0] = TONIGHT.time.split(':').map(Number);
  const start = parseISODate(today);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + TONIGHT.minutes * 60_000);
  const local = (d: Date) =>
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
  const utc = (d: Date) =>
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
  const escape = (s: string) => s.replace(/([,;\\])/g, '\\$1');
  const summary = escape(TONIGHT.headline.join(' '));
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Catalysis//Prayer//EN',
    'BEGIN:VEVENT',
    `UID:${TONIGHT.id}-${today}@catalysis.app`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${local(start)}`,
    `DTEND:${local(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escape(TONIGHT.summary)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadReminder(today: ISODate) {
  const url = URL.createObjectURL(new Blob([tonightICS(today)], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${TONIGHT.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function TonightCard({ today }: { today: ISODate }) {
  const reminded = useApp((s) => s.reminderIds.includes(TONIGHT.id));
  const toggleReminder = useApp((s) => s.toggleReminder);
  const remind = () => {
    if (!reminded) downloadReminder(today);
    toggleReminder(TONIGHT.id);
  };
  return (
    <section aria-label="Tonight" className="md:col-span-2 lg:col-span-4 lg:row-span-2">
      <Photo
        media={TONIGHT.media}
        scrim="linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.85))"
        className="flex h-full min-h-[460px] flex-col justify-between gap-10 rounded-[28px] p-[22px] md:p-[26px]"
      >
        <span className="gs relative -mt-1 -ml-1 self-start rounded-full bg-a4 px-[13px] py-[7px] text-[13px] font-bold text-on-a">
          Tonight · {formatHour(TONIGHT.time)}
        </span>
        <div className="relative">
          <h2 className="bq text-[44px] leading-[.95] font-bold tracking-[-.03em] text-white">
            {TONIGHT.headline[0]}
            <br />
            <span className="tracking-normal">{TONIGHT.headline[1]}</span>
          </h2>
          <p className="gs mt-3 text-[15px] text-on-photo">{TONIGHT.summary}</p>
          <Pill
            variant="white"
            icon={reminded ? Check : Bell}
            aria-pressed={reminded}
            onClick={remind}
            className="mt-5 w-full p-[15px] text-[15px]"
          >
            {reminded ? 'Reminder set' : 'Remind me'}
          </Pill>
          <Pill href={guidedHref(TONIGHT.guidedId)} variant="onSolid" className="mt-[10px] w-full p-[14px] text-[15px]">
            Pray now
          </Pill>
        </div>
      </Photo>
    </section>
  );
}

/* ---------- guided prayers ---------- */

const GUIDED_CARDS: Record<string, { title: string; description: string; kind: string; tone: Tone; icon: LucideIcon }> = {
  'g-examen': { title: 'The Examen', description: 'St. Ignatius, five steps', kind: 'guided', tone: 'a3', icon: Moon },
  'g-lectio': { title: 'Lectio Divina', description: 'On Sunday’s Gospel', kind: 'guided', tone: 'a4', icon: BookOpen },
  'g-chaplet': { title: 'Divine Mercy', description: 'Pray it at 3 PM', kind: 'chaplet', tone: 'a5', icon: Heart },
};
const FALLBACK_TONES: Tone[] = ['a3', 'a4', 'a5'];

function GuidedRow() {
  const items = FEATURED_GUIDED_IDS.map((id) => GUIDED_PRAYERS.find((g) => g.id === id)).filter((g) => g !== undefined);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="guided-heading" className="md:col-span-2 lg:col-span-8">
      <h2 id="guided-heading" className="sr-only">Guided prayers</h2>
      <ul className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((guided, i) => {
          const card = GUIDED_CARDS[guided.id];
          const tone = card?.tone ?? FALLBACK_TONES[i % FALLBACK_TONES.length] ?? 'a3';
          return (
            <li key={guided.id}>
              <Link
                href={guidedHref(guided.id)}
                className={cx('hover-lift flex h-full min-h-[236px] flex-col justify-between gap-5 rounded-[28px] p-6 text-on-a', TONE_BG[tone])}
              >
                <div className="flex justify-between gap-3">
                  <span className="mn">{guided.minutes} min · {card?.kind ?? 'guided'}</span>
                  <Ico icon={card?.icon ?? Moon} size={20} />
                </div>
                <div>
                  <h3 className="bq text-[30px] leading-none font-bold tracking-[-.04em]">{card?.title ?? guided.title}</h3>
                  {card ? <p className="gs mt-[6px] truncate text-[14px]">{card.description}</p> : null}
                </div>
                <span aria-hidden className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-on-a text-white">
                  <Ico icon={Play} size={18} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- prayer book and journal ---------- */

function BookCard({ today }: { today: ISODate }) {
  const rosary = rosaryFor(today);
  return (
    <Card as="section" aria-label="Prayer book" className="flex flex-col justify-between gap-6 p-[26px] md:col-span-1 lg:col-span-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Prayer book</CardTitle>
          <Ico icon={BookText} size={20} className="text-a1" />
        </div>
        <p className="gs mt-2 text-[15px] leading-[1.5] text-muted">
          {GUIDED_PRAYERS.length} prayers of the Church, to read or to pray step by step.
        </p>
        <ul className="gs mt-5 flex flex-col gap-2">
          {[rosary, ...['g-our-father', 'g-memorare'].map((id) => GUIDED_PRAYERS.find((g) => g.id === id)).filter((g) => g !== undefined)].map((prayer, i) => (
            <li key={prayer.id}>
              <Link href={prayerHref(prayer.id)} className="hover-dim flex items-center gap-3 rounded-[16px] bg-inset px-[14px] py-3">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{prayer.title}</span>
                <span className="shrink-0 text-[13px] text-subtle">{i === 0 ? 'Today’s Rosary' : `${prayer.minutes} min`}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Pill href="/prayer/book" iconAfter={ArrowRight} className="self-start px-[22px] py-[13px] text-[15px]">Open the prayer book</Pill>
    </Card>
  );
}

function JournalCard() {
  const latest = useApp((s) => s.journal[0]);
  const count = useApp((s) => s.journal.length);
  return (
    <Card as="section" surface="a4" aria-label="Journal" className="flex flex-col justify-between gap-6 p-[26px] md:col-span-1 lg:col-span-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Journal</CardTitle>
          <Ico icon={NotebookPen} size={20} />
        </div>
        {latest ? (
          <Link href="/prayer/journal" className="hover-dim mt-5 block rounded-[18px] bg-white/55 p-[18px]">
            <span className="mn block">{formatDayShort(parseISODate(latest.date))}{latest.title ? ` · ${latest.title}` : ''}</span>
            <span className="nr mt-2 line-clamp-3 block text-[17px] leading-[1.55]">{latest.body}</span>
          </Link>
        ) : (
          <p className="gs mt-2 text-[15px] leading-[1.5]">Keep what prayer gives you: a word, a thanksgiving, a name you promised to pray for.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-[10px]">
        <Pill href="/prayer/journal?new=1" variant="dark" icon={Plus} className="px-[22px] py-[13px] text-[15px]">Write</Pill>
        {count > 0 ? (
          <Pill href="/prayer/journal" variant="white" className="px-[20px] py-[13px] text-[15px]">{count === 1 ? '1 entry' : `${count} entries`}</Pill>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------- add a prayer ---------- */

function AddPrayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addPrayer = useApp((s) => s.addPrayer);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Give the prayer a name.');
      return;
    }
    addPrayer({ title, scheduledTime: time || '08:00' });
    setTitle('');
    setError('');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add a prayer">
      <form onSubmit={submit} noValidate>
        <Field id="prayer-title" label="Prayer" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Liturgy of the Hours" error={error} />
        <Field id="prayer-time" label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-[18px]" />
        <Pill type="submit" className="mt-6 w-full p-[15px] text-[15px]">Add to my rule</Pill>
      </form>
    </Sheet>
  );
}

export default function PrayerPage() {
  const { today } = useToday();
  const [adding, setAdding] = useState(false);
  return (
    <Page>
      <div className="mb-[22px] flex flex-col gap-4 pt-1 md:flex-row md:items-end md:justify-between">
        <PageTitle accent="one day at a time">Prayer</PageTitle>
        <Pill icon={Plus} onClick={() => setAdding(true)} className="self-start px-[22px] py-[13px] text-[15px] md:self-auto">
          Add a prayer
        </Pill>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <StreakCard today={today} />
        <TodayCard today={today} />
        <TonightCard today={today} />
        <GuidedRow />
        <BookCard today={today} />
        <JournalCard />
      </div>
      <AddPrayer open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}
