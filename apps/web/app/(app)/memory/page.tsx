'use client';

import {
  dueMemory, formatDayShort, knownMemory, learningMemory, memoryLabel, memoryStatus, nextMemoryReview, parseISODate,
  SUGGESTED_PASSAGES, type MemoryVerse, type SuggestedPassage,
} from '@catalysis/api';
import { ArrowRight, Brain, Plus, RotateCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BoxMeter } from '@/components/memory';
import { BackLink, Page } from '@/components/shell';
import { Card, CardTitle, cx, EmptyState, PageTitle, Pill, Sheet, SheetAction } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { loadPassageText } from '@/lib/memory';
import { useApp } from '@/lib/store';

const preview = (text: string) => (text.length > 110 ? `${text.slice(0, text.lastIndexOf(' ', 110))}…` : text);

function ReviewCard({ verses, today }: { verses: MemoryVerse[]; today: string }) {
  const due = dueMemory(verses, today);
  const next = nextMemoryReview(verses, today);
  return (
    <Card as="section" surface="solid" aria-label="Review" className="flex min-h-[230px] flex-col justify-between gap-6 p-[26px] lg:col-span-5">
      <span className="mn text-a2">Today’s review</span>
      <div>
        <div className="bq text-[64px] leading-[.85] font-extrabold tracking-[-.03em] text-white">{due.length}</div>
        <p className="gs mt-2 text-[15px] text-on-solid-muted">
          {due.length > 0
            ? `${due.length === 1 ? 'passage' : 'passages'} to recite today`
            : next
              ? `All caught up. Next review ${formatDayShort(parseISODate(next))}.`
              : 'Learn a passage and it will come back here to review.'}
        </p>
      </div>
      {due.length > 0 ? (
        <Pill href="/memory/review" variant="highlight" iconAfter={ArrowRight} className="self-start px-[20px] py-[12px] text-[15px]">Start review</Pill>
      ) : null}
    </Card>
  );
}

function Stats({ verses }: { verses: MemoryVerse[] }) {
  const known = knownMemory(verses).length;
  const learning = learningMemory(verses).length;
  const items = [
    { label: 'Known by heart', value: known, tone: 'bg-a2' },
    { label: 'Reviewing', value: verses.length - known - learning, tone: 'bg-a4' },
    { label: 'Learning', value: learning, tone: 'bg-a3' },
  ];
  return (
    <Card as="section" aria-label="Your progress" className="flex flex-col justify-between gap-6 p-[26px] lg:col-span-7">
      <div>
        <CardTitle>Hide the word in your heart</CardTitle>
        <p className="gs mt-2 max-w-[520px] text-[15px] leading-[1.5] text-muted">
          Learn a passage in a few short steps, then recite it from memory as it comes back: after a day, three days, a week, and further apart each time it holds.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className={cx('rounded-[18px] p-4 text-on-a', item.tone)}>
            <dd className="bq text-[34px] leading-none font-bold">{item.value}</dd>
            <dt className="gs mt-1 text-[13px]">{item.label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function PassageRow({ verse, today, onMore }: { verse: MemoryVerse; today: string; onMore: (verse: MemoryVerse) => void }) {
  const status = memoryStatus(verse, today);
  return (
    <li className="flex items-center gap-3 rounded-[20px] bg-inset p-4">
      <Link href={`/memory/${verse.id}`} className="hover-dim min-w-0 flex-1">
        <span className="gs block text-[16px] font-semibold text-ink">{memoryLabel(verse)}</span>
        <span className="nr mt-1 block text-[15px] leading-[1.45] text-muted">{preview(verse.text)}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <BoxMeter box={verse.box} />
          <span className={cx('gs text-[12px] font-semibold', status === 'Due today' ? 'text-a1' : 'text-muted')}>{status}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={`More for ${memoryLabel(verse)}`}
        onClick={() => onMore(verse)}
        className="gs hover-dim relative shrink-0 rounded-full px-2 py-1 text-[20px] leading-none text-muted after:absolute after:-inset-2"
      >
        ⋯
      </button>
    </li>
  );
}

function Suggestions({ verses }: { verses: MemoryVerse[] }) {
  const add = useApp((s) => s.addMemoryVerse);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const key = (p: SuggestedPassage) => `${p.bookId}/${p.chapter}/${p.verseStart}`;
  const open = SUGGESTED_PASSAGES.filter((p) => !verses.some((v) => v.bookId === p.bookId && v.chapter === p.chapter && v.verseStart === p.verseStart));
  if (open.length === 0) return null;

  const pick = async (p: SuggestedPassage) => {
    setBusy(key(p));
    setError('');
    try {
      const text = await loadPassageText(p.bookId, p.chapter, p.verseStart, p.verseEnd);
      const saved = add({ ...p, text });
      if (saved) router.push(`/memory/${saved.id}`);
      else setError('That passage could not be added.');
    } catch {
      setError('The Bible text could not be loaded just now. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card as="section" aria-label="Passages to start with" className="p-[26px]">
      <CardTitle>Passages to start with</CardTitle>
      <p className="gs mt-2 text-[14px] text-muted">Or select any verses in the Bible and tap Memorize.</p>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {open.map((p) => (
          <li key={key(p)} className="flex items-center justify-between gap-3 rounded-[18px] bg-inset px-4 py-3">
            <span className="min-w-0">
              <span className="gs block text-[15px] font-semibold text-ink">{memoryLabel(p)}</span>
              <span className="gs block text-[13px] text-muted">{p.theme}</span>
            </span>
            <Pill
              variant="ghost"
              icon={Plus}
              iconSize={14}
              disabled={busy !== null}
              onClick={() => void pick(p)}
              aria-label={`Learn ${memoryLabel(p)}`}
              className="shrink-0 px-[14px] py-[8px] text-[13px]"
            >
              {busy === key(p) ? 'Adding…' : 'Learn'}
            </Pill>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="gs mt-3 text-[14px] text-a1">{error}</p> : null}
    </Card>
  );
}

export default function MemoryPage() {
  const { today } = useToday();
  const verses = useApp((s) => s.memory ?? []);
  const remove = useApp((s) => s.removeMemoryVerse);
  const restart = useApp((s) => s.restartMemoryVerse);
  const router = useRouter();
  const [menu, setMenu] = useState<MemoryVerse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const learning = learningMemory(verses);
  const others = verses
    .filter((v) => v.box > 0)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.createdAt.localeCompare(b.createdAt));

  const close = () => {
    setMenu(null);
    setConfirming(false);
  };

  return (
    <Page>
      <BackLink href="/scripture">Bible</BackLink>
      <div className="mb-[22px]">
        <PageTitle accent="by heart">Scripture</PageTitle>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ReviewCard verses={verses} today={today} />
        <Stats verses={verses} />

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          {learning.length > 0 ? (
            <Card as="section" aria-label="Learning" className="p-[26px]">
              <CardTitle>Learning</CardTitle>
              <ul className="mt-4 flex flex-col gap-2">
                {learning.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 rounded-[20px] bg-inset p-4">
                    <span className="min-w-0">
                      <span className="gs block text-[16px] font-semibold text-ink">{memoryLabel(v)}</span>
                      <span className="nr mt-1 block text-[15px] leading-[1.45] text-muted">{preview(v.text)}</span>
                    </span>
                    <Pill href={`/memory/${v.id}`} icon={Brain} iconSize={15} className="shrink-0 px-[16px] py-[9px] text-[14px]">Learn</Pill>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card as="section" aria-label="Your passages" className="p-[26px]">
            <CardTitle>Your passages</CardTitle>
            {others.length === 0 ? (
              <EmptyState className="mt-3">
                {verses.length === 0 ? 'Nothing saved yet. Choose a passage to start with.' : 'Passages you have learned will be listed here.'}
              </EmptyState>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {others.map((v) => <PassageRow key={v.id} verse={v} today={today} onMore={setMenu} />)}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <Suggestions verses={verses} />
        </div>
      </div>

      <Sheet open={menu !== null} onClose={close} title={menu ? memoryLabel(menu) : ''}>
        {menu ? (
          <>
            <SheetAction icon={Brain} onClick={() => router.push(`/memory/${menu.id}`)}>Practise</SheetAction>
            <SheetAction
              icon={RotateCcw}
              onClick={() => {
                restart(menu.id);
                close();
              }}
            >
              Learn it again from the start
            </SheetAction>
            <SheetAction
              icon={Trash2}
              danger
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                remove(menu.id);
                close();
              }}
            >
              {confirming ? 'Tap again to remove' : 'Remove'}
            </SheetAction>
          </>
        ) : null}
      </Sheet>
    </Page>
  );
}
