'use client';

import { findPrayer, formatTime12 } from '@catalysis/api';
import { ArrowLeft, ArrowRight, Check, NotebookPen, Play, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { guidedHref, journalHref, prayerHref, PrayerWords, ScriptureLink, stepCount } from '@/components/prayer-book';
import { BackLink, Page } from '@/components/shell';
import { Card, Chip, EmptyState, Field, PageTitle, Pill, Sheet } from '@/components/ui';
import { useApp } from '@/lib/store';

function AddToRule({ prayerId, title }: { prayerId: string; title: string }) {
  const inRule = useApp((s) => s.prayers.find((p) => p.guidedContentId === prayerId));
  const addPrayer = useApp((s) => s.addPrayer);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('08:00');

  if (inRule) {
    return (
      <span className="gs inline-flex items-center gap-2 rounded-full bg-inset px-[18px] py-[12px] text-[14px] font-semibold text-muted">
        <Check width={15} height={15} strokeWidth={2} aria-hidden />
        In your rule · {formatTime12(inRule.scheduledTime)}
      </span>
    );
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    addPrayer({ title, scheduledTime: time || '08:00', guidedContentId: prayerId });
    setOpen(false);
  };
  return (
    <>
      <Pill variant="ghost" icon={Plus} onClick={() => setOpen(true)} className="px-[18px] py-[12px] text-[14px]">Add to my rule</Pill>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add to my rule">
        <form onSubmit={submit}>
          <p className="gs text-[15px] leading-[1.5] text-muted">{title} will appear in your daily prayers at the time you choose.</p>
          <Field id="rule-time" label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-[18px]" />
          <Pill type="submit" className="mt-6 w-full p-[15px] text-[15px]">Add to my rule</Pill>
        </form>
      </Sheet>
    </>
  );
}

export default function PrayerBookEntry() {
  const { id } = useParams<{ id: string }>();
  const found = findPrayer(id);

  if (!found) {
    return (
      <Page>
        <BackLink href="/prayer/book">Prayer book</BackLink>
        <PageTitle>Prayer not found</PageTitle>
        <EmptyState className="mt-4">That prayer is not in the book.</EmptyState>
      </Page>
    );
  }

  const { prayer, section } = found;
  const index = section.prayers.findIndex((p) => p.id === prayer.id);
  const previous = section.prayers[index - 1];
  const next = section.prayers[index + 1];
  const single = prayer.steps.length === 1;

  return (
    <Page>
      <BackLink href="/prayer/book">Prayer book</BackLink>
      <div className="mx-auto max-w-[760px]">
        <Chip tone={section.tone}>{section.title}</Chip>
        <PageTitle className="mt-4 md:text-[52px]">{prayer.title}</PageTitle>
        <p className="gs mt-3 text-[16px] leading-[1.5] text-muted">
          {prayer.summary ? `${prayer.summary} · ` : ''}{prayer.minutes} min · {stepCount(prayer.steps)}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-[10px]">
          <Pill href={guidedHref(prayer.id)} icon={Play} className="px-[22px] py-[13px] text-[15px]">
            {single ? 'Pray it now' : 'Pray step by step'}
          </Pill>
          <AddToRule prayerId={prayer.id} title={prayer.title} />
          <Pill href={journalHref(prayer.id)} variant="ghost" icon={NotebookPen} className="px-[18px] py-[12px] text-[14px]">Write in journal</Pill>
        </div>

        <Card as="article" className="mt-7 p-6 md:p-9">
          <ol className="flex flex-col gap-9">
            {prayer.steps.map((step, i) => (
              <li key={step.title}>
                {single ? null : (
                  <div className="flex items-baseline gap-3">
                    <span className="bq text-[15px] font-bold text-a1">{i + 1}</span>
                    <h2 className="bq text-[22px] leading-[1.15] font-bold tracking-[-.03em] text-ink">{step.title.replace(/^\d+\.\s/, '')}</h2>
                  </div>
                )}
                <p className="gs mt-2 text-[15px] leading-[1.55] text-muted">{step.body}</p>
                {step.scripture ? <div className="mt-3"><ScriptureLink reference={step.scripture} /></div> : null}
                {step.prayer ? <PrayerWords text={step.prayer} className="mt-4 text-[19px] md:text-[20px]" /> : null}
              </li>
            ))}
          </ol>
        </Card>

        <nav aria-label="More in this section" className="mt-5 grid grid-cols-2 gap-3">
          {previous ? (
            <Pill href={prayerHref(previous.id)} variant="inset" icon={ArrowLeft} className="justify-start truncate px-[18px] py-[14px] text-[14px]">
              <span className="truncate">{previous.title}</span>
            </Pill>
          ) : <span />}
          {next ? (
            <Pill href={prayerHref(next.id)} variant="inset" iconAfter={ArrowRight} className="justify-end truncate px-[18px] py-[14px] text-[14px]">
              <span className="truncate">{next.title}</span>
            </Pill>
          ) : null}
        </nav>
      </div>
    </Page>
  );
}
