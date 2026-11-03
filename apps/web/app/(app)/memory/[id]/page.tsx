'use client';

import { checkRecitation, hiddenWords, memoryHref, memoryLabel, memoryTokens, type Recitation } from '@catalysis/api';
import { ArrowLeft, ArrowRight, BookOpen, Check, Shuffle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { PassageWords, RecitationView } from '@/components/memory';
import { BackLink, Page } from '@/components/shell';
import { Card, cx, EmptyState, PageTitle, Pill, TextAction } from '@/components/ui';
import { useApp } from '@/lib/store';

type StepId = 'read' | 'gaps' | 'more' | 'letters' | 'recite';

const STEPS: { id: StepId; label: string; title: string; hint: string; share?: number }[] = [
  { id: 'read', label: 'Read', title: 'Read it aloud', hint: 'Read the passage aloud, slowly, three times. Notice where it breathes.' },
  { id: 'gaps', label: 'Gaps', title: 'Fill the gaps', hint: 'Say the whole passage aloud, filling each gap. Tap a gap to peek.', share: 0.3 },
  { id: 'more', label: 'More gaps', title: 'Fill more gaps', hint: 'Most of the words are gone now. Say it all; peek only when you must.', share: 0.65 },
  { id: 'letters', label: 'First letters', title: 'From first letters', hint: 'Only the first letter of each word is left. Say the passage from them.', share: 1 },
  { id: 'recite', label: 'Recite', title: 'Recite from memory', hint: 'Type it from memory. Capitals and punctuation don’t matter.' },
];

function Stepper({ at, onPick }: { at: number; onPick: (i: number) => void }) {
  return (
    <ol aria-label="Steps" className="gs flex gap-[6px] overflow-x-auto pb-1 text-[13px] font-semibold">
      {STEPS.map((step, i) => (
        <li key={step.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onPick(i)}
            aria-current={i === at ? 'step' : undefined}
            className={cx(
              'hover-dim flex items-center gap-[6px] rounded-full px-[12px] py-[7px]',
              i === at ? 'bg-btn text-btn-text' : i < at ? 'bg-a2 text-on-a' : 'bg-inset text-muted',
            )}
          >
            {i < at ? <Check size={13} aria-hidden /> : <span aria-hidden>{i + 1}</span>}
            {step.label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Recite({ text, onResult }: { text: string; onResult: (result: Recitation, typed: string) => void }) {
  const id = useId();
  const [typed, setTyped] = useState('');
  const check = () => {
    if (typed.trim()) onResult(checkRecitation(text, typed), typed);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      check();
    }
  };
  return (
    <div>
      <label htmlFor={id} className="sr-only">The passage, from memory</label>
      <textarea
        id={id}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={onKey}
        rows={5}
        autoFocus
        autoCapitalize="sentences"
        spellCheck={false}
        placeholder="Type the passage…"
        className="nr w-full resize-y rounded-[20px] border border-line bg-inset p-4 text-[19px] leading-[1.6] text-ink outline-none focus:border-ink"
      />
      <Pill onClick={check} disabled={!typed.trim()} icon={Check} className="mt-3 px-[20px] py-[12px] text-[15px]">Check</Pill>
    </div>
  );
}

export default function LearnPassage() {
  const { id } = useParams<{ id: string }>();
  const verse = useApp((s) => (s.memory ?? []).find((v) => v.id === decodeURIComponent(id)));
  const review = useApp((s) => s.reviewMemoryVerse);
  const [at, setAt] = useState(0);
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<Recitation | null>(null);
  const [aloud, setAloud] = useState(false);
  const [learned, setLearned] = useState(false);
  // Whether the passage was still being learned when the page opened: practice of a known passage leaves its schedule alone.
  const [wasLearning] = useState(() => verse?.box === 0);

  const step = STEPS[at] ?? STEPS[0]!;
  const text = verse?.text ?? '';
  const hidden = useMemo(
    () => (step.share === undefined ? new Set<number>() : hiddenWords(text, step.share, round)),
    [text, step.share, round],
  );

  if (!verse) {
    return (
      <Page>
        <BackLink href="/memory">Scripture by heart</BackLink>
        <Card className="p-[26px]">
          <EmptyState>That passage isn’t in your list.</EmptyState>
          <Pill href="/memory" className="mt-4 px-[18px] py-[11px] text-[14px]">See your passages</Pill>
        </Card>
      </Page>
    );
  }

  const go = (i: number) => {
    setAt(Math.max(0, Math.min(STEPS.length - 1, i)));
    setRevealed(new Set());
    setResult(null);
    setAloud(false);
  };
  const reveal = (i: number) => setRevealed((r) => new Set(r).add(i));
  const finish = () => {
    if (wasLearning) review(verse.id, 'good');
    setLearned(true);
  };
  const words = memoryTokens(text).filter((t) => t.word).length;

  return (
    <Page>
      <BackLink href="/memory">Scripture by heart</BackLink>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageTitle accent={wasLearning ? 'learning' : 'practice'}>{memoryLabel(verse)}</PageTitle>
        <Pill href={memoryHref(verse)} variant="inset" icon={BookOpen} iconSize={15} className="self-start px-[14px] py-[8px] text-[14px] md:self-auto">
          Open in the Bible
        </Pill>
      </div>

      {learned ? (
        <Card as="section" surface="a2" aria-label="Learned" className="max-w-[860px] p-[26px] md:p-8">
          <h2 className="bq text-[34px] leading-none font-bold tracking-[-.03em]">{wasLearning ? 'Learned.' : 'Well done.'}</h2>
          <p className="gs mt-3 max-w-[520px] text-[16px] leading-[1.5] text-on-am">
            {wasLearning
              ? 'It will come back tomorrow for you to recite, then after three days, a week, and further apart each time it holds.'
              : 'Its next review stays where it was.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill href="/memory" variant="dark" iconAfter={ArrowRight} className="px-[20px] py-[12px] text-[15px]">Scripture by heart</Pill>
            <Pill variant="white" onClick={() => { setLearned(false); go(0); }} className="px-[20px] py-[12px] text-[15px]">Practise again</Pill>
          </div>
        </Card>
      ) : (
        <div className="flex max-w-[860px] flex-col gap-4">
          <Stepper at={at} onPick={go} />
          <Card as="section" aria-label={step.title} className="p-[22px] md:p-8">
            <h2 className="bq text-[26px] leading-none font-bold tracking-[-.03em] text-ink">{step.title}</h2>
            <p className="gs mt-2 text-[15px] leading-[1.5] text-muted">{step.hint}</p>

            {step.id === 'recite' ? (
              <div className="mt-6">
                {result ? (
                  <div>
                    <div className="mn text-a1" role="status">
                      {Math.round(result.score * words)} of {words} words{result.score === 1 ? ' · every word' : ''}
                    </div>
                    <div className="mt-3"><RecitationView result={result} /></div>
                    <p className="gs mt-3 text-[14px] text-muted">
                      {result.score < 0.8
                        ? 'Not there yet. Marked words are the ones you missed. Go back a step, or try again.'
                        : result.score < 1
                          ? 'Marked words are the ones you missed.'
                          : 'Nothing missed.'}
                      {result.extra > 0 ? ` You added ${result.extra} ${result.extra === 1 ? 'word' : 'words'} that ${result.extra === 1 ? 'isn’t' : 'aren’t'} in the passage.` : ''}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {result.score >= 0.8 ? (
                        <Pill onClick={finish} iconAfter={ArrowRight} className="px-[20px] py-[12px] text-[15px]">{wasLearning ? 'I’ve learned it' : 'Done'}</Pill>
                      ) : null}
                      <Pill variant="inset" onClick={() => setResult(null)} className="px-[20px] py-[12px] text-[15px]">Try again</Pill>
                      <Pill variant="inset" icon={ArrowLeft} iconSize={15} onClick={() => go(3)} className="px-[20px] py-[12px] text-[15px]">First letters</Pill>
                    </div>
                  </div>
                ) : aloud ? (
                  <div>
                    <p className="nr text-[22px] leading-[1.7] text-ink">{text}</p>
                    <p className="gs mt-4 text-[15px] text-muted">Did you say every word?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill onClick={finish} icon={Check} className="px-[20px] py-[12px] text-[15px]">Yes, all of it</Pill>
                      <Pill variant="inset" onClick={() => go(3)} className="px-[20px] py-[12px] text-[15px]">Not yet</Pill>
                    </div>
                  </div>
                ) : (
                  <>
                    <Recite text={text} onResult={(r) => setResult(r)} />
                    <TextAction onClick={() => setAloud(true)} className="mt-4 text-[14px] text-muted underline underline-offset-4">
                      Say it aloud instead, then check
                    </TextAction>
                  </>
                )}
              </div>
            ) : (
              <>
                <PassageWords
                  text={text}
                  hidden={hidden}
                  revealed={revealed}
                  onReveal={reveal}
                  letters={step.id === 'letters'}
                  className="mt-6"
                />
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  <Pill onClick={() => go(at + 1)} iconAfter={ArrowRight} className="px-[20px] py-[12px] text-[15px]">
                    {at === 0 ? 'I’ve read it' : 'Next'}
                  </Pill>
                  {step.id === 'gaps' || step.id === 'more' ? (
                    <Pill
                      variant="inset"
                      icon={Shuffle}
                      iconSize={15}
                      onClick={() => {
                        setRound((r) => r + 1);
                        setRevealed(new Set());
                      }}
                      className="px-[18px] py-[12px] text-[15px]"
                    >
                      New gaps
                    </Pill>
                  ) : null}
                  {at > 0 ? (
                    <TextAction onClick={() => go(at - 1)} className="ml-1 text-[14px] text-muted underline underline-offset-4">Back a step</TextAction>
                  ) : null}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
