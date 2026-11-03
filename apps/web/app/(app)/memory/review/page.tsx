'use client';

import {
  checkRecitation, dueMemory, firstLetters, formatDayShort, memoryLabel, memoryTokens, nextMemoryReview, parseISODate, suggestedGrade,
  type MemoryGrade, type Recitation,
} from '@catalysis/api';
import { ArrowRight, Check, Eye, Lightbulb } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { GradeButtons, RecitationView } from '@/components/memory';
import { BackLink, Page } from '@/components/shell';
import { Card, EmptyState, PageTitle, Pill, Progress, TextAction } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { useApp } from '@/lib/store';

export default function ReviewPage() {
  const { now, today } = useToday();
  const memory = useApp((s) => s.memory ?? []);
  const review = useApp((s) => s.reviewMemoryVerse);
  // The passages due when the session began; grading one moves it on without reshuffling the rest.
  const [queue] = useState(() => dueMemory(memory, today).map((v) => v.id));
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<Recitation | null>(null);
  const [shown, setShown] = useState(false);
  const [hint, setHint] = useState(false);
  const [tally, setTally] = useState<Record<MemoryGrade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const id = useId();

  const verse = memory.find((v) => v.id === queue[at]);
  const done = at >= queue.length;

  const grade = (g: MemoryGrade) => {
    if (!verse) return;
    review(verse.id, g, now);
    setTally((t) => ({ ...t, [g]: t[g] + 1 }));
    setAt((i) => i + 1);
    setTyped('');
    setResult(null);
    setShown(false);
    setHint(false);
  };
  const check = () => {
    if (verse && typed.trim()) setResult(checkRecitation(verse.text, typed));
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      check();
    }
  };

  if (queue.length === 0 || done || !verse) {
    const next = nextMemoryReview(memory, today);
    const reviewed = Object.values(tally).reduce((a, b) => a + b, 0);
    return (
      <Page>
        <BackLink href="/memory">Scripture by heart</BackLink>
        <PageTitle accent="review">Today’s</PageTitle>
        <Card as="section" surface={reviewed > 0 ? 'a2' : 'card'} aria-label="Review finished" className="mt-5 max-w-[860px] p-[26px] md:p-8">
          {reviewed > 0 ? (
            <>
              <h2 className="bq text-[34px] leading-none font-bold tracking-[-.03em]">
                {reviewed} {reviewed === 1 ? 'passage' : 'passages'} recited.
              </h2>
              <p className="gs mt-3 text-[16px] leading-[1.5] text-on-am">
                {tally.again > 0 ? `${tally.again} will come back tomorrow. ` : ''}
                {next ? `Next review ${formatDayShort(parseISODate(next))}.` : ''}
              </p>
            </>
          ) : (
            <EmptyState>{next ? `Nothing is due today. Next review ${formatDayShort(parseISODate(next))}.` : 'Nothing to review yet.'}</EmptyState>
          )}
          <Pill href="/memory" variant={reviewed > 0 ? 'dark' : 'primary'} iconAfter={ArrowRight} className="mt-6 px-[20px] py-[12px] text-[15px]">
            Scripture by heart
          </Pill>
        </Card>
      </Page>
    );
  }

  const words = memoryTokens(verse.text).filter((t) => t.word).length;
  return (
    <Page>
      <BackLink href="/memory">Scripture by heart</BackLink>
      <div className="flex max-w-[860px] flex-col gap-4">
        <div>
          <div className="mn text-muted" role="status">{at + 1} of {queue.length}</div>
          <Progress value={at / queue.length} label="Review progress" className="mt-2" />
        </div>
        <Card as="section" aria-label={memoryLabel(verse)} className="p-[22px] md:p-8">
          <PageTitle className="text-[34px] md:text-[44px]">{memoryLabel(verse)}</PageTitle>

          {result ? (
            <div className="mt-6">
              <div className="mn text-a1">{Math.round(result.score * words)} of {words} words</div>
              <div className="mt-3"><RecitationView result={result} /></div>
            </div>
          ) : shown ? (
            <p className="nr mt-6 text-[22px] leading-[1.7] text-ink">{verse.text}</p>
          ) : (
            <div className="mt-6">
              <p className="gs text-[15px] text-muted">Recite it from memory: type it below, or say it aloud and then show it.</p>
              {hint ? <p className="nr mt-3 text-[20px] leading-[1.6] text-muted" aria-label="First letters">{firstLetters(verse.text)}</p> : null}
              <label htmlFor={id} className="sr-only">The passage, from memory</label>
              <textarea
                id={id}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={onKey}
                rows={4}
                autoFocus
                spellCheck={false}
                placeholder="Type the passage…"
                className="nr mt-4 w-full resize-y rounded-[20px] border border-line bg-inset p-4 text-[19px] leading-[1.6] text-ink outline-none focus:border-ink"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill onClick={check} disabled={!typed.trim()} icon={Check} className="px-[20px] py-[12px] text-[15px]">Check</Pill>
                <Pill variant="inset" icon={Eye} iconSize={15} onClick={() => setShown(true)} className="px-[18px] py-[12px] text-[15px]">Show it</Pill>
                {!hint ? (
                  <TextAction onClick={() => setHint(true)} className="ml-1 inline-flex items-center gap-1 text-[14px] text-muted underline underline-offset-4">
                    <Lightbulb size={14} aria-hidden /> First letters
                  </TextAction>
                ) : null}
              </div>
            </div>
          )}

          {result || shown ? (
            <div className="mt-7">
              <p className="gs mb-3 text-[15px] font-semibold text-ink">How did it go?</p>
              <GradeButtons
                verse={verse}
                now={now}
                today={today}
                suggested={result ? (hint && suggestedGrade(result.score) === 'good' ? 'hard' : suggestedGrade(result.score)) : undefined}
                onGrade={grade}
              />
            </div>
          ) : null}
        </Card>
      </div>
    </Page>
  );
}
