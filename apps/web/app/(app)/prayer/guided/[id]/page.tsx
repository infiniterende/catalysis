'use client';

import { buildRule, findPrayer } from '@catalysis/api';
import { NotebookPen } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { journalHref, prayerHref, PrayerWords, ScriptureLink } from '@/components/prayer-book';
import { cx, Pill } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { useApp } from '@/lib/store';

/** Guided prayer, one step at a time. Finishing it marks the matching prayer in today's rule. */
export default function GuidedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { today } = useToday();
  const guided = findPrayer(id)?.prayer;
  const prayers = useApp((s) => s.prayers);
  const logs = useApp((s) => s.prayerLogs);
  const togglePrayer = useApp((s) => s.togglePrayer);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // Each step starts at its top, and a screen reader is taken to its title.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [index, finished]);

  if (!guided) {
    return (
      <main className="flex min-h-dvh flex-col items-start justify-center gap-5 bg-solid px-[26px] py-10 text-on-solid md:items-center">
        <h1 className="bq text-[32px] leading-[1.05] font-bold tracking-[-.03em] text-white md:text-[44px]">Prayer not found</h1>
        <p className="gs text-[15px] leading-[1.5] text-on-solid-muted">That prayer could not be found.</p>
        <Pill href="/prayer" variant="highlight" className="px-[22px] py-[13px] text-[15px]">Back to prayer</Pill>
      </main>
    );
  }

  const step = guided.steps[index];
  const last = index === guided.steps.length - 1;
  const prompt = [...guided.steps].reverse().find((s) => s.prompt)?.prompt;

  const finish = () => {
    const row = buildRule(prayers, logs, today).find((r) => r.prayer.guidedContentId === guided.id);
    if (row && !row.done) togglePrayer(row.prayer.id);
    setFinished(true);
  };

  if (finished) {
    return (
      <main className="flex min-h-dvh flex-col bg-solid text-on-solid">
        <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center px-[26px] py-10">
          <div>
            <span className="gs inline-flex rounded-full bg-a2 px-[13px] py-[7px] text-[13px] font-bold text-on-a">{guided.title}</span>
          </div>
          <h1 ref={heading} tabIndex={-1} className="bq mt-6 text-[64px] leading-none font-bold tracking-[-.04em] text-white outline-none md:text-[88px]">Amen.</h1>
          <p className="gs mt-6 text-[18px] leading-[1.6] text-on-solid md:text-[20px]">
            {prompt ?? 'Stay a moment in silence. If something stirred in you, write it down while it is fresh.'}
          </p>
          <div className="mt-9 grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            <Pill href={journalHref(guided.id)} variant="highlight" icon={NotebookPen} className="p-4 text-[15px]">Write in journal</Pill>
            <Pill variant="onSolid" onClick={() => router.push('/prayer')} className="p-[15px] text-[15px]">Done</Pill>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-solid text-on-solid">
      <div className="flex items-center justify-between gap-4 px-5 pt-5 md:px-9 md:pt-7">
        <Pill
          variant="onSolid"
          onClick={() => (window.history.length > 1 ? router.back() : router.push(prayerHref(guided.id)))}
          className="px-[18px] py-[10px] text-[14px]"
        >
          Close
        </Pill>
        <span className="mn min-w-0 truncate text-on-solid-muted">{guided.title} · {guided.minutes} min</span>
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center px-[26px] py-10" aria-live="polite">
        <div>
          <span className="gs inline-flex rounded-full bg-a2 px-[13px] py-[7px] text-[13px] font-bold text-on-a">
            {guided.steps.length === 1 ? `${guided.minutes} min` : `Step ${index + 1} of ${guided.steps.length}`}
          </span>
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className={cx('bq mt-6 leading-[1.02] font-bold tracking-[-.03em] text-white outline-none', step?.prayer ? 'text-[36px] md:text-[48px]' : 'text-[44px] md:text-[64px]')}
        >
          {step?.title.replace(/^\d+\.\s/, '')}
        </h1>
        <p className={cx('gs mt-5 leading-[1.6]', step?.prayer ? 'text-[16px] text-on-solid-muted' : 'text-[18px] text-on-solid md:text-[21px]')}>{step?.body}</p>
        {step?.scripture ? <div className="mt-5"><ScriptureLink reference={step.scripture} onSolid /></div> : null}
        {step?.prayer ? <PrayerWords text={step.prayer} onSolid className="mt-7 text-[20px] md:text-[22px]" /> : null}
      </div>

      <div className="sticky bottom-0 mx-auto w-full max-w-[640px] bg-solid px-[26px] pt-4 pb-[max(30px,env(safe-area-inset-bottom))]">
        {guided.steps.length > 1 ? (
          <div className="mb-5 flex gap-[5px]" aria-hidden>
            {guided.steps.map((s, i) => (
              <div key={s.title} className={cx('h-[6px] flex-1 rounded-full', i <= index ? 'bg-a2' : 'bg-white/20')} />
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-[10px]">
          <Pill variant="onSolid" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} className="p-[15px] text-[15px]">
            Back
          </Pill>
          <Pill variant="highlight" onClick={last ? finish : () => setIndex((i) => i + 1)} className="p-4 text-[15px]">
            {last ? 'Amen' : 'Continue'}
          </Pill>
        </div>
      </div>
    </main>
  );
}
