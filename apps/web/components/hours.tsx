'use client';

import type { HourPara, HourSection, HourText } from '@catalysis/api';
import { cx } from './ui';

const allRubric = (para: HourPara) => para.every((line) => line.spans.every((s) => s.s === 'r'));
const firstText = (para: HourPara) => para[0]?.spans.map((s) => s.t).join('') ?? '';

/** A psalm or canticle's heading: red lines naming it, such as "Psalm 93 / Splendor of God the Creator". */
const isPsalmHeading = (para: HourPara) => allRubric(para) && /^(Psalm|Canticle)\b/i.test(firstText(para));

function Paragraph({ para }: { para: HourPara }) {
  if (isPsalmHeading(para)) {
    const [title, ...rest] = para;
    return (
      <div className="mt-2">
        <h4 className="bq text-[19px] leading-tight font-bold tracking-[-.02em] text-a1">{title?.spans.map((s) => s.t).join('')}</h4>
        {rest.map((line, i) => (
          <p key={i} className="gs mt-1 text-[14px] text-muted">{line.spans.map((s) => s.t).join('')}</p>
        ))}
      </div>
    );
  }
  if (allRubric(para)) {
    // An instruction, printed in red in a breviary.
    return (
      <p className="gs text-[14px] leading-[1.5] text-a1 italic">
        {para.map((line, i) => <span key={i} className="block">{line.spans.map((s) => s.t).join('')}</span>)}
      </p>
    );
  }
  return (
    <p className="nr text-[19px] leading-[1.6] text-ink md:text-[20px]">
      {para.map((line, i) => (
        <span key={i} className={cx('block', line.indent && 'pl-6 md:pl-8')}>
          {line.spans.map((span, j) => (
            <span key={j} className={cx(span.s === 'r' && 'gs text-[0.85em] font-semibold text-a1', span.s === 'i' && 'italic')}>
              {span.t}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

export const sectionId = (index: number) => `hour-section-${index}`;

export function HourSectionView({ section, index }: { section: HourSection; index: number }) {
  return (
    <section aria-labelledby={sectionId(index)} className="scroll-mt-28">
      {section.title ? (
        <h3 id={sectionId(index)} className="mn mb-4 text-a1">{section.title}</h3>
      ) : null}
      <div className="flex flex-col gap-4">
        {section.paras.map((para, i) => <Paragraph key={i} para={para} />)}
      </div>
    </section>
  );
}

export function HourBody({ text }: { text: HourText }) {
  return (
    <div className="flex flex-col gap-10">
      {text.sections.map((section, i) => <HourSectionView key={`${i}-${section.title}`} section={section} index={i} />)}
    </div>
  );
}
