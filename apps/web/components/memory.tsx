'use client';

import {
  MAX_BOX, memoryStatus, memoryTokens, reviewMemory, type MemoryGrade, type MemoryVerse, type Recitation,
} from '@catalysis/api';
import { useMemo } from 'react';
import { cx } from './ui';

/** The passage's words, with some hidden behind gaps the member can tap to peek at. */
export function PassageWords({
  text, hidden, revealed, onReveal, letters = false, className,
}: {
  text: string;
  /** Indexes of the words to hide. */
  hidden: Set<number>;
  /** Hidden words the member has peeked at. */
  revealed: Set<number>;
  onReveal: (index: number) => void;
  /** Show each hidden word's first letter, as a cue. */
  letters?: boolean;
  className?: string;
}) {
  const tokens = useMemo(() => memoryTokens(text), [text]);
  return (
    <p className={cx('nr text-[22px] leading-[1.75] text-ink md:text-[26px]', className)}>
      {tokens.map((t, i) => {
        const gap = t.word && hidden.has(i) && !revealed.has(i);
        return (
          <span key={i}>
            {i > 0 ? ' ' : null}
            {t.lead}
            {gap ? (
              <button
                type="button"
                onClick={() => onReveal(i)}
                aria-label={letters ? `Word starting with ${t.word.charAt(0)}, tap to show` : 'Hidden word, tap to show'}
                className="hover-dim mx-[1px] inline-block translate-y-[3px] rounded-[6px] bg-inset px-[3px] text-left align-baseline leading-[1.25] text-a1"
                // A gap hints at the word's length; a first letter needs only a little room after it.
                style={{ minWidth: letters ? `${Math.max(1, t.word.length * 0.3)}em` : `${Math.max(2, t.word.length * 0.55)}em` }}
              >
                {letters ? t.word.charAt(0) : ' '}
              </button>
            ) : (
              <span className={cx(t.word && revealed.has(i) && 'rounded-[4px] bg-a2/40 text-ink')}>{t.word}</span>
            )}
            {t.tail}
          </span>
        );
      })}
    </p>
  );
}

/** A recitation checked against the passage: missed words are marked. */
export function RecitationView({ result }: { result: Recitation }) {
  return (
    <p className="nr text-[20px] leading-[1.7] text-ink">
      {result.words.map((w, i) => (
        <span key={i}>
          {i > 0 ? ' ' : null}
          {w.lead}
          {w.ok ? w.word : <mark className="rounded-[4px] bg-a1/25 px-[2px] text-ink underline decoration-a1 decoration-2 underline-offset-4">{w.word}</mark>}
          {w.tail}
        </span>
      ))}
    </p>
  );
}

/** How far through the review boxes a passage has come. */
export function BoxMeter({ box, className, onSolid }: { box: number; className?: string; onSolid?: boolean }) {
  return (
    <span role="img" aria-label={box === 0 ? 'Learning' : `Box ${box} of ${MAX_BOX}`} className={cx('flex gap-[3px]', className)}>
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <span
          key={i}
          className={cx(
            'h-[6px] w-[14px] rounded-full',
            i < box ? (onSolid ? 'bg-a2' : 'bg-a1') : onSolid ? 'bg-white/20' : 'bg-inset',
          )}
        />
      ))}
    </span>
  );
}

const GRADES: { grade: MemoryGrade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
];

/** How well the passage came back, with when each answer would bring it round again. */
export function GradeButtons({
  verse, now, today, suggested, onGrade,
}: { verse: MemoryVerse; now: Date; today: string; suggested?: MemoryGrade; onGrade: (grade: MemoryGrade) => void }) {
  return (
    <div role="group" aria-label="How did it go?" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {GRADES.map(({ grade, label }) => {
        const after = reviewMemory(verse, grade, now);
        const when = after.dueOn <= today ? 'Again today' : memoryStatus(after, today).replace(/^Next /, '');
        return (
          <button
            key={grade}
            type="button"
            onClick={() => onGrade(grade)}
            className={cx(
              'gs hover-dim flex flex-col items-center rounded-[18px] px-3 py-[11px] text-center',
              suggested === grade ? 'bg-btn text-btn-text' : 'bg-inset text-ink',
            )}
          >
            <span className="text-[15px] font-semibold">{label}</span>
            <span className={cx('text-[12px]', suggested === grade ? 'opacity-80' : 'text-muted')}>{when}</span>
          </button>
        );
      })}
    </div>
  );
}
