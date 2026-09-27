'use client';

import {
  findPrayer, journalFor, MONTHS, MONTHS_SHORT, parseISODate, WEEKDAYS_SHORT,
  type JournalEntry, type JournalKind, type Tone,
} from '@catalysis/api';
import { Check, Lock, NotebookPen, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { ScriptureLink } from '@/components/prayer-book';
import { BackLink, Page } from '@/components/shell';
import { Card, CardTitle, Chip, cx, EmptyState, Field, FieldError, Ico, PageTitle, Pill, Sheet, Skeleton, TextAction, TONE_BG } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { useApp } from '@/lib/store';

const KINDS: Record<JournalKind, { label: string; tone: Tone; prompt: string }> = {
  free: { label: 'Free writing', tone: 'a3', prompt: 'What is on your heart today?' },
  gratitude: { label: 'Gratitude', tone: 'a2', prompt: 'Name three gifts from today, however small.' },
  petition: { label: 'Petition', tone: 'a6', prompt: 'Who, or what, are you bringing to the Lord?' },
  examen: { label: 'Examen', tone: 'a4', prompt: 'Where did you notice God today? What grace do you need tomorrow?' },
  lectio: { label: 'Lectio', tone: 'a5', prompt: 'Which word or phrase stayed with you, and what did you say in reply?' },
};
const KIND_ORDER: JournalKind[] = ['free', 'gratitude', 'petition', 'examen', 'lectio'];

/** The kind of entry a prayer from the book most naturally leads to. */
const kindAfter = (prayerId?: string): JournalKind => (prayerId === 'g-examen' ? 'examen' : prayerId === 'g-lectio' ? 'lectio' : 'free');

interface Draft {
  id?: string;
  kind: JournalKind;
  date: string;
  title: string;
  body: string;
  scripture: string;
  prayerId?: string;
}

/* ---------- writing ---------- */

function Editor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const save = useApp((s) => s.saveJournalEntry);
  const remove = useApp((s) => s.deleteJournalEntry);
  const toggleAnswered = useApp((s) => s.toggleAnswered);
  const stored = useApp((s) => (draft.id ? s.journal.find((e) => e.id === draft.id) : undefined));
  const [form, setForm] = useState(draft);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const prayer = form.prayerId ? findPrayer(form.prayerId)?.prayer : undefined;
  const prompt = (prayer && [...prayer.steps].reverse().find((s) => s.prompt)?.prompt) || KINDS[form.kind].prompt;
  const set = (patch: Partial<Draft>) => setForm((f) => ({ ...f, ...patch }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.body.trim()) {
      setError('Write a few words first.');
      return;
    }
    save({ id: form.id, kind: form.kind, date: form.date, title: form.title, body: form.body, scripture: form.scripture, prayerId: form.prayerId });
    onClose();
  };

  return (
    <form onSubmit={submit} noValidate>
      <div role="radiogroup" aria-label="Kind of entry" className="flex flex-wrap gap-2">
        {KIND_ORDER.map((kind) => {
          const on = form.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ kind })}
              className={cx('gs rounded-full px-[14px] py-2 text-[13px] font-semibold', on ? 'bg-btn text-btn-text' : 'hover-dim bg-inset text-ink')}
            >
              {KINDS[kind].label}
            </button>
          );
        })}
      </div>
      {prayer ? <p className="gs mt-4 text-[13px] text-muted">After {prayer.title}</p> : null}

      <label htmlFor="journal-body" className="mn mt-5 block text-muted">Entry</label>
      <textarea
        id="journal-body"
        value={form.body}
        onChange={(e) => { set({ body: e.target.value }); setError(''); }}
        placeholder={prompt}
        rows={8}
        maxLength={20000}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'journal-body-error' : undefined}
        className={cx('nr mt-2 block w-full resize-y rounded-[16px] bg-inset px-[18px] py-4 text-[18px] leading-[1.6] text-ink', error && 'ring-2 ring-a1')}
      />
      <FieldError id="journal-body-error">{error}</FieldError>

      <Field id="journal-title" label="Title (optional)" value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} className="mt-[18px]" />
      <div className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field id="journal-date" label="Day" type="date" value={form.date} onChange={(e) => set({ date: e.target.value || draft.date })} />
        <Field id="journal-scripture" label="Passage (optional)" value={form.scripture} onChange={(e) => set({ scripture: e.target.value })} placeholder="John 15:5" maxLength={60} />
      </div>

      <Pill type="submit" className="mt-6 w-full p-[15px] text-[15px]">{form.id ? 'Save changes' : 'Save entry'}</Pill>

      {stored ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {stored.kind === 'petition' ? (
            <TextAction onClick={() => toggleAnswered(stored.id)} aria-pressed={Boolean(stored.answeredOn)} className="text-ink">
              {stored.answeredOn ? 'Mark as not yet answered' : 'Mark as answered'}
            </TextAction>
          ) : <span />}
          {confirming ? (
            <span className="gs flex items-center gap-4 text-[13px] text-muted">
              Delete this entry?
              <TextAction onClick={() => { remove(stored.id); onClose(); }} className="text-a1">Delete</TextAction>
              <TextAction onClick={() => setConfirming(false)} className="text-ink">Keep</TextAction>
            </span>
          ) : (
            <TextAction onClick={() => setConfirming(true)} className="inline-flex items-center gap-[6px] text-subtle">
              <Ico icon={Trash2} size={14} />
              Delete
            </TextAction>
          )}
        </div>
      ) : null}
    </form>
  );
}

/* ---------- reading ---------- */

function EntryCard({ entry, onOpen }: { entry: JournalEntry; onOpen: () => void }) {
  const day = parseISODate(entry.date);
  const kind = KINDS[entry.kind];
  const prayer = entry.prayerId ? findPrayer(entry.prayerId)?.prayer : undefined;
  return (
    <li>
      <article className="flex gap-4 rounded-[24px] border border-line bg-card p-5 md:gap-5 md:p-6">
        <div className={cx('flex h-[64px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[16px] text-on-a', TONE_BG[kind.tone])}>
          <span className="mn text-[10px]">{WEEKDAYS_SHORT[day.getDay()]}</span>
          <span className="bq text-[26px] leading-none font-extrabold tracking-[-.03em]">{day.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={kind.tone}>{kind.label}</Chip>
            {entry.answeredOn ? (
              <Chip tone="a2">
                <Ico icon={Check} size={12} />
                Answered
              </Chip>
            ) : null}
            {prayer ? <span className="gs text-[12px] text-subtle">after {prayer.title}</span> : null}
          </div>
          <button type="button" onClick={onOpen} className="mt-3 block w-full text-left" aria-label={`Open entry: ${entry.title ?? entry.body.slice(0, 40)}`}>
            {entry.title ? <h3 className="bq text-[20px] leading-[1.15] font-bold tracking-[-.03em] text-ink">{entry.title}</h3> : null}
            <p className={cx('nr line-clamp-4 text-[17px] leading-[1.6] whitespace-pre-line text-ink', entry.title && 'mt-[6px]')}>{entry.body}</p>
          </button>
          {entry.scripture ? <div className="mt-3"><ScriptureLink reference={entry.scripture} /></div> : null}
        </div>
      </article>
    </li>
  );
}

function Filters({ kind, onKind, counts }: { kind: JournalKind | 'all'; onKind: (k: JournalKind | 'all') => void; counts: Record<string, number> }) {
  const options: (JournalKind | 'all')[] = ['all', ...KIND_ORDER];
  return (
    <div role="tablist" aria-label="Kinds of entry" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {options.map((option) => {
        const on = kind === option;
        const count = option === 'all' ? counts.all : counts[option];
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onKind(option)}
            className={cx('gs shrink-0 rounded-full px-4 py-[9px] text-[13px] font-semibold', on ? 'bg-btn text-btn-text' : 'hover-dim bg-inset text-ink')}
          >
            {option === 'all' ? 'All' : KINDS[option].label}
            {count ? <span className={cx('ml-[6px]', on ? 'opacity-70' : 'text-subtle')}>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function Journal() {
  const router = useRouter();
  const params = useSearchParams();
  const { today } = useToday();
  const entries = useApp((s) => s.journal);
  const [kind, setKind] = useState<JournalKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Draft | null>(null);

  // `?new=1&prayer=g-examen` opens a blank entry, as the guided player and prayer book ask for.
  const asked = params.get('new') === '1';
  const askedPrayer = params.get('prayer') ?? undefined;
  const blank = (overrides: Partial<Draft> = {}): Draft => ({ kind: 'free', date: today, title: '', body: '', scripture: '', ...overrides });
  const fromLink = asked ? blank({ prayerId: findPrayer(askedPrayer ?? '') ? askedPrayer : undefined, kind: kindAfter(askedPrayer) }) : null;
  const draft = picked ?? fromLink;

  const close = () => {
    setPicked(null);
    if (asked) router.replace('/prayer/journal');
  };
  const open = (entry: JournalEntry) =>
    setPicked({ id: entry.id, kind: entry.kind, date: entry.date, title: entry.title ?? '', body: entry.body, scripture: entry.scripture ?? '', prayerId: entry.prayerId });

  const shown = useMemo(
    () => journalFor({ journal: entries }, { kind: kind === 'all' ? undefined : kind, query }),
    [entries, kind, query],
  );
  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: entries.length };
    for (const entry of entries) tally[entry.kind] = (tally[entry.kind] ?? 0) + 1;
    return tally;
  }, [entries]);

  const months = useMemo(() => {
    const groups: { key: string; label: string; entries: JournalEntry[] }[] = [];
    for (const entry of shown) {
      const key = entry.date.slice(0, 7);
      const day = parseISODate(entry.date);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.entries.push(entry);
      else groups.push({ key, label: `${MONTHS[day.getMonth()]} ${day.getFullYear()}`, entries: [entry] });
    }
    return groups;
  }, [shown]);

  const thisMonth = entries.filter((e) => e.date.startsWith(today.slice(0, 7)));
  const daysWritten = new Set(thisMonth.map((e) => e.date)).size;
  const waiting = entries.filter((e) => e.kind === 'petition' && !e.answeredOn);
  const answered = entries.filter((e) => e.kind === 'petition' && e.answeredOn).length;
  const monthName = MONTHS_SHORT[parseISODate(today).getMonth()];

  return (
    <Page>
      <BackLink href="/prayer">Prayer</BackLink>
      <div className="mb-[22px] flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle accent="between you and God">Journal</PageTitle>
        <Pill icon={Plus} onClick={() => setPicked(blank())} className="self-start px-[22px] py-[13px] text-[15px] md:self-auto">New entry</Pill>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Filters kind={kind} onKind={setKind} counts={counts} />
            <label className="flex shrink-0 items-center gap-[10px] rounded-full bg-inset px-4 md:w-[230px]">
              <Ico icon={Search} size={15} className="text-subtle" />
              <span className="sr-only">Search the journal</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search entries" className="gs min-w-0 flex-1 py-[10px] text-[14px] text-ink" />
            </label>
          </div>

          {entries.length === 0 ? (
            <Card className="mt-5 p-7 md:p-9">
              <CardTitle>Begin with one line.</CardTitle>
              <EmptyState className="mt-3 max-w-[520px]">
                A journal keeps what prayer gives you: a word from Scripture, a thanksgiving, a name you promised to pray for. Write as little as you like.
              </EmptyState>
              <Pill icon={NotebookPen} onClick={() => setPicked(blank())} className="mt-6 px-[22px] py-[13px] text-[15px]">Write the first entry</Pill>
            </Card>
          ) : months.length === 0 ? (
            <EmptyState className="mt-8">No entry matches.</EmptyState>
          ) : (
            months.map((month) => (
              <section key={month.key} aria-label={month.label} className="mt-7">
                <h2 className="mn mb-3 text-muted">{month.label}</h2>
                <ul className="flex flex-col gap-3">
                  {month.entries.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={() => open(entry)} />)}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside aria-label="About your journal" className="flex flex-col gap-4 lg:col-span-4">
          <Card surface="a2" className="p-[26px]">
            <h2 className="gs text-[15px] font-semibold">{monthName} so far</h2>
            <div className="mt-5 flex items-end gap-3">
              <span className="bq text-[88px] leading-[.8] font-extrabold tracking-[-.03em]">{daysWritten}</span>
              <span className="gs pb-1 text-[15px] font-semibold">{daysWritten === 1 ? 'day written' : 'days written'}</span>
            </div>
            <p className="gs mt-5 text-[14px]">{thisMonth.length} {thisMonth.length === 1 ? 'entry' : 'entries'} · {entries.length} in all</p>
          </Card>

          <Card className="p-[26px]">
            <CardTitle>Petitions</CardTitle>
            <p className="gs mt-2 text-[14px] text-muted">{waiting.length} waiting · {answered} answered</p>
            {waiting.length === 0 ? (
              <EmptyState className="mt-4 text-[14px]">Write a petition to keep track of what you are praying for.</EmptyState>
            ) : (
              <ul className="gs mt-4 flex flex-col gap-2">
                {waiting.slice(0, 4).map((entry) => (
                  <li key={entry.id}>
                    <button type="button" onClick={() => open(entry)} className="hover-dim block w-full truncate rounded-[14px] bg-inset px-[14px] py-3 text-left text-[14px] font-medium text-ink">
                      {entry.title ?? entry.body}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Pill variant="ghost" icon={Plus} onClick={() => setPicked(blank({ kind: 'petition' }))} className="mt-4 w-full p-3 text-[14px]">New petition</Pill>
          </Card>

          <Card surface="inset" className="flex gap-3 p-5">
            <Ico icon={Lock} size={17} className="mt-[2px] text-muted" />
            <p className="gs text-[13px] leading-[1.5] text-muted">Your journal is private. It is never shown in the community or to other members.</p>
          </Card>
        </aside>
      </div>

      <Sheet open={draft !== null} onClose={close} title={draft?.id ? 'Edit entry' : 'New entry'} className="md:w-[620px]">
        {draft ? <Editor key={draft.id ?? `new-${draft.kind}-${draft.prayerId ?? ''}`} draft={draft} onClose={close} /> : null}
      </Sheet>
    </Page>
  );
}

function Loading() {
  return (
    <Page>
      <Skeleton className="h-12 w-64" />
      <Skeleton className="mt-6 h-40 rounded-[24px]" />
      <Skeleton className="mt-3 h-40 rounded-[24px]" />
    </Page>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Journal />
    </Suspense>
  );
}
