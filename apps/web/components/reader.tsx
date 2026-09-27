'use client';

import {
  adjacentChapter, BIBLE_BOOKS, BibleTextError, booksOf, chapterLabel, DEMO_ANSWERS, fetchChapter, getBook,
  highlightsFor, isBookmarked, notesFor, parseLumenBlocks, verseLabel, verseRanges, verseRuns, versesLabel,
  type ChapterRef, type ChapterText, type Citation, type EditionId, type Highlight, type Testament, type Tone,
  type Verse,
} from '@catalysis/api';
import { loadNabreBook, type NabreBook } from '@catalysis/bible-nabre';
import { Bookmark, ChevronLeft, ChevronRight, Eraser, Headphones, LibraryBig, Search, Sparkles, Square, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore,
  type CSSProperties, type Ref, type TouchEvent,
} from 'react';
import { Page } from '@/components/shell';
import {
  Card, CircleButton, cx, EmptyState, Ico, Pill, Segmented, Sheet, Skeleton, SkeletonLines,
  TextAction, TONE_BG,
} from '@/components/ui';
import { useIsWide } from '@/lib/hooks';
import { useExplain } from '@/lib/lumen';
import { useApp } from '@/lib/store';

const chapterHref = (ref: ChapterRef) => `/scripture/${ref.bookId}/${ref.chapter}`;

const SIZES = [
  { id: '0.9', label: 'Small' },
  { id: '1', label: 'Regular' },
  { id: '1.15', label: 'Large' },
  { id: '1.3', label: 'Larger' },
];
const SPACINGS = [
  { id: '0.9', label: 'Tight' },
  { id: '1', label: 'Regular' },
  { id: '1.15', label: 'Open' },
];
const TESTAMENTS: { id: Testament; label: string }[] = [
  { id: 'Old Testament', label: 'Old' },
  { id: 'New Testament', label: 'New' },
];
const HIGHLIGHTERS: Tone[] = ['a2', 'a3', 'a5'];
const NO_HIGHLIGHTS: Highlight[] = [];

const isTone = (value: string | undefined): value is Tone => Boolean(value && value in TONE_BG);
const covers = (h: Highlight, verse: number) => verse >= h.verseStart && verse <= h.verseEnd;

const subscribeNever = () => () => undefined;
const canSpeak = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** A browser capability, false on the server and until the page is live. */
function useSupported(check: () => boolean): boolean {
  return useSyncExternalStore(subscribeNever, check, () => false);
}

/* ---------- text loading ---------- */

type Load =
  | { status: 'loading' }
  | { status: 'ready'; chapter: ChapterText }
  | { status: 'error'; message: string; retry: boolean };

function useChapter(ref: ChapterRef, edition: EditionId | undefined) {
  const [attempt, setAttempt] = useState(0);
  const key = `${ref.bookId}/${ref.chapter}/${edition ?? ''}/${attempt}`;
  const [load, setLoad] = useState<{ key: string } & Load>({ key, status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchChapter({ bookId: ref.bookId, chapter: ref.chapter }, { edition, signal: controller.signal })
      .then((chapter) => setLoad({ key, status: 'ready', chapter }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        const known = error instanceof BibleTextError;
        setLoad({
          key,
          status: 'error',
          message: known ? error.message : 'The text could not be loaded just now.',
          retry: !known || error.reason === 'network',
        });
      });
    return () => controller.abort();
  }, [key, ref.bookId, ref.chapter, edition]);

  const current: Load = load.key === key ? load : { status: 'loading' };
  return { load: current, retry: () => setAttempt((n) => n + 1) };
}

/** The whole of one book, for searching. Loaded only once it is wanted. */
function useBookText(bookId: string, wanted: boolean): { book?: NabreBook; failed: boolean } {
  const [loaded, setLoaded] = useState<{ id: string; book?: NabreBook }>({ id: '' });

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    loadNabreBook(bookId)
      .then((book) => {
        if (live) setLoaded({ id: bookId, book });
      })
      .catch(() => {
        if (live) setLoaded({ id: bookId });
      });
    return () => {
      live = false;
    };
  }, [bookId, wanted]);

  const current = loaded.id === bookId;
  return { book: current ? loaded.book : undefined, failed: current && !loaded.book };
}

/* ---------- listening ---------- */

/** Reads the chapter aloud with the browser's own voice. */
function useListen(chapter: ChapterText | undefined, key: string) {
  const supported = useSupported(canSpeak);
  const [speaking, setSpeaking] = useState<string | null>(null);
  // Held so the browser does not drop queued utterances before they are spoken.
  const queue = useRef<SpeechSynthesisUtterance[]>([]);

  // Falls silent when the chapter changes and when the reader closes.
  useEffect(
    () => () => {
      queue.current = [];
      if (canSpeak()) window.speechSynthesis.cancel();
    },
    [key],
  );

  const words = useMemo(
    () => (chapter ? chapter.verses.reduce((sum, v) => sum + v.text.split(/\s+/).filter(Boolean).length, 0) : 0),
    [chapter],
  );

  const toggle = () => {
    if (!chapter || !canSpeak()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking === key) {
      queue.current = [];
      setSpeaking(null);
      return;
    }
    const stop = () => setSpeaking((now) => (now === key ? null : now));
    // One utterance per verse: long single utterances are cut short by some browsers.
    queue.current = chapter.verses.map((verse, i) => {
      const utterance = new SpeechSynthesisUtterance(verse.text);
      utterance.onerror = stop;
      if (i === chapter.verses.length - 1) utterance.onend = stop;
      return utterance;
    });
    queue.current.forEach((utterance) => synth.speak(utterance));
    setSpeaking(key);
  };

  return { supported, speaking: speaking === key, minutes: Math.max(1, Math.round(words / 150)), toggle };
}

/* ---------- book browser ---------- */

interface VerseHit {
  chapter: number;
  verse: number;
  before: string;
  match: string;
  after: string;
}

const MAX_HITS = 20;

function findVerses(book: NabreBook, query: string): VerseHit[] {
  const needle = query.toLowerCase();
  const hits: VerseHit[] = [];
  for (const [index, verses] of book.chapters.entries()) {
    for (const verse of verses) {
      const at = verse.t.toLowerCase().indexOf(needle);
      if (at < 0) continue;
      const from = Math.max(0, at - 28);
      const end = at + needle.length;
      const to = Math.min(verse.t.length, end + 44);
      hits.push({
        chapter: index + 1,
        verse: verse.n,
        before: `${from > 0 ? '…' : ''}${verse.t.slice(from, at)}`,
        match: verse.t.slice(at, end),
        after: `${verse.t.slice(end, to)}${to < verse.t.length ? '…' : ''}`,
      });
      if (hits.length === MAX_HITS) return hits;
    }
  }
  return hits;
}

function BookBrowser({ current, onNavigate, className }: { current: ChapterRef; onNavigate?: () => void; className?: string }) {
  const open = getBook(current.bookId);
  const [query, setQuery] = useState('');
  // The testament follows the open book until the reader picks the other one.
  const [choice, setChoice] = useState<{ bookId: string; testament: Testament } | null>(null);
  const testament = choice?.bookId === current.bookId ? choice.testament : (open?.testament ?? 'New Testament');

  const q = query.trim();
  const searching = q.length > 0;
  // Verses are searched from three characters on.
  const needle = q.length >= 3 ? q : '';
  const inText = needle !== '';
  const books = searching ? BIBLE_BOOKS.filter((b) => b.name.toLowerCase().includes(q.toLowerCase())) : booksOf(testament);
  const { book: bookText, failed } = useBookText(current.bookId, inText);
  const hits = bookText && needle ? findVerses(bookText, needle) : [];
  const loadingText = inText && !bookText && !failed;

  const list = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const box = list.current;
    const row = active.current;
    if (box && row) box.scrollTop = row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2;
  }, [testament, searching, current.bookId]);

  return (
    <div className={cx('flex min-h-0 flex-col', className)}>
      <div className="gs flex shrink-0 items-center gap-[9px] rounded-full bg-inset px-[15px] text-[14px] text-subtle">
        <Ico icon={Search} size={16} />
        <input
          type="search"
          aria-label="Search the Bible"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Bible"
          maxLength={80}
          className="min-w-0 flex-1 py-[11px] text-[14px] text-ink [&::-webkit-search-cancel-button]:hidden"
        />
        {searching ? (
          <button type="button" aria-label="Clear the search" onClick={() => setQuery('')} className="hover-accent relative text-muted after:absolute after:-inset-3">
            <Ico icon={X} size={15} />
          </button>
        ) : null}
      </div>

      {searching ? null : (
        <Segmented
          items={TESTAMENTS}
          value={testament}
          onChange={(id) => setChoice({ bookId: current.bookId, testament: id })}
          label="Testament"
          stretch
          className="mt-[14px] shrink-0"
        />
      )}

      <div ref={list} className="relative mt-[14px] min-h-[132px] flex-1 overflow-y-auto">
        {books.length > 0 ? (
          <nav aria-label="Books" className="gs flex flex-col gap-[2px] text-[15px] text-ink">
            {books.map((book) => {
              const on = book.id === current.bookId;
              return (
                <Link
                  key={book.id}
                  ref={on ? active : undefined}
                  href={chapterHref({ bookId: book.id, chapter: 1 })}
                  aria-current={on ? 'true' : undefined}
                  onClick={onNavigate}
                  className={cx(
                    'flex items-center justify-between gap-3 rounded-[12px] px-3 py-[10px]',
                    on ? 'bg-a2 font-semibold text-on-a' : 'hover-inset',
                  )}
                >
                  {book.name}
                  {on ? <span className="mn text-[10px]">{book.chapters} ch</span> : null}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {inText && open ? (
          <section aria-label={`Verses in ${open.name}`} className={books.length > 0 ? 'mt-[18px]' : ''}>
            {loadingText ? <SkeletonLines lines={3} /> : null}
            {hits.length > 0 ? (
              <>
                <div className="mn text-muted">In {open.name}</div>
                <ul className="gs mt-[10px] flex flex-col gap-[6px]">
                  {hits.map((hit) => (
                    <li key={`${hit.chapter}:${hit.verse}`}>
                      <Link
                        href={`${chapterHref({ bookId: open.id, chapter: hit.chapter })}?verse=${hit.verse}`}
                        onClick={onNavigate}
                        className="hover-dim block rounded-[12px] bg-inset px-3 py-[10px]"
                      >
                        <b className="block text-[13px] font-bold text-ink">{verseLabel(open.id, hit.chapter, hit.verse)}</b>
                        <span className="mt-[2px] block text-[13px] leading-[1.45] text-muted">
                          {hit.before}
                          <mark className="rounded-[4px] bg-a2 px-[2px] text-on-a">{hit.match}</mark>
                          {hit.after}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        {searching && books.length === 0 && hits.length === 0 && !loadingText ? (
          <EmptyState className="px-1">
            {inText && open ? `No book or verse in ${open.name} matches “${q}”.` : `No book matches “${q}”.`}
          </EmptyState>
        ) : null}
      </div>

      {open && !searching ? (
        <nav aria-label={`Chapters of ${open.name}`} className="mt-[18px] flex max-h-[42%] shrink-0 flex-col">
          <div className="mn text-muted">Chapters</div>
          <div className="gs mt-[10px] grid grid-cols-5 gap-[6px] overflow-y-auto text-center text-[13px] font-medium text-ink">
            {Array.from({ length: open.chapters }, (_, i) => i + 1).map((n) => {
              const on = n === current.chapter;
              return (
                <Link
                  key={n}
                  href={chapterHref({ bookId: open.id, chapter: n })}
                  aria-current={on ? 'page' : undefined}
                  aria-label={`${open.name} ${n}`}
                  onClick={onNavigate}
                  className={cx('rounded-[10px] py-2', on ? 'bg-a1 font-bold text-on-a' : 'hover-dim bg-inset')}
                >
                  {n}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

/* ---------- scripture ---------- */

/** Section headings, set as caps labels between the verses they divide. */
function Headings({ headings, first }: { headings: string[]; first?: boolean }) {
  return (
    <span
      role="heading"
      aria-level={2}
      onClick={(e) => e.stopPropagation()}
      className={cx('mn block cursor-default text-muted', first ? 'mb-[10px]' : 'mt-[30px] mb-[10px]')}
    >
      {headings.map((heading, i) => (
        <span key={i} className={cx('block', i > 0 && 'mt-1')}>{heading}</span>
      ))}
    </span>
  );
}

function Scripture({
  chapter, selected, onSelect,
}: { chapter: ChapterText; selected: number[]; onSelect: (verses: number[]) => void }) {
  const highlights = useApp((s) => highlightsFor(s, chapter.ref));
  const notes = useApp((s) => notesFor(s, chapter.ref));
  const { scale, spacing } = useApp((s) => s.reader);
  // Where a shift-click extends from.
  const anchor = useRef<number | null>(null);

  const pick = (verse: number, extend: boolean) => {
    if (extend && anchor.current !== null) {
      const [from, to] = anchor.current < verse ? [anchor.current, verse] : [verse, anchor.current];
      onSelect(chapter.verses.map((v) => v.number).filter((n) => n >= from && n <= to));
      return;
    }
    anchor.current = verse;
    // Each verse clicked joins the selection; clicking it again takes it out.
    onSelect(selected.includes(verse) ? selected.filter((n) => n !== verse) : [...selected, verse].sort((x, y) => x - y));
  };

  /** Dragging across verses selects every verse the drag touched. */
  const onMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const verseOf = (node: Node | null) => {
      const element = node instanceof Element ? node : node?.parentElement;
      const value = element?.closest('[data-verse]')?.getAttribute('data-verse');
      return value ? Number(value) : null;
    };
    const start = verseOf(selection.anchorNode);
    const end = verseOf(selection.focusNode);
    if (start === null || end === null) return;
    if (start === end) {
      // Within one verse the dragged phrase stays selected, ready to be highlighted on its own.
      anchor.current = start;
      onSelect([start]);
      return;
    }
    const [from, to] = start < end ? [start, end] : [end, start];
    anchor.current = from;
    selection.removeAllRanges();
    onSelect(chapter.verses.map((v) => v.number).filter((n) => n >= from && n <= to));
  };

  return (
    <p
      className="nr mt-6 max-w-[640px] text-[length:calc(18px*var(--scale))] text-ink md:text-[length:calc(22px*var(--scale))]"
      style={{ '--scale': scale, lineHeight: 1.75 * spacing } as CSSProperties}
      onMouseUp={onMouseUp}
    >
      {chapter.verses.map((verse, index) => {
        // Whole-verse highlights are laid down first so a highlighted phrase shows on top of them.
        const marks = highlights
          .filter((h) => covers(h, verse.number))
          .sort((x, y) => Number(Boolean(x.text)) - Number(Boolean(y.text)))
          .map((h) => ({ text: h.text, color: h.color }));
        const isSelected = selected.includes(verse.number);
        const hasNote = notes.some((n) => n.verseStart === verse.number);
        return (
          <span key={verse.number}>
            {verse.headings ? <Headings headings={verse.headings} first={index === 0} /> : null}
            <sup className="mn text-[10px] text-a1">{verse.number}</sup>{' '}
            <span
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Verse ${verse.number}: ${verse.text}`}
              data-verse={verse.number}
              onClick={(e) => {
                // A drag has already been handled when the mouse was released.
                if (!(window.getSelection()?.isCollapsed ?? true)) return;
                pick(verse.number, e.shiftKey);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(verse.number, e.shiftKey);
                }
              }}
              className={cx(
                'cursor-pointer rounded-[6px] box-decoration-clone py-[2px]',
                isSelected && 'bg-inset underline decoration-a1 decoration-2 underline-offset-[6px]',
              )}
            >
              {verseRuns(verse, marks).map((run, i) => {
                if (run.kind === 'headings') return <Headings key={i} headings={run.headings} />;
                if (!run.text) return null;
                return run.highlighted ? (
                  <span
                    key={i}
                    className={cx('rounded-[6px] box-decoration-clone px-[5px] py-[2px] text-on-a', TONE_BG[isTone(run.color) ? run.color : 'a2'])}
                  >
                    {run.text}
                  </span>
                ) : (
                  <span key={i}>{run.text}</span>
                );
              })}
            </span>
            {hasNote ? <span role="img" aria-label="Has a note" className="gs ml-1 align-super text-[10px] font-bold text-a1">✎</span> : null}{' '}
          </span>
        );
      })}
    </p>
  );
}

/* ---------- verse actions ---------- */

function useVerseActions(chapter: ChapterText | undefined, selected: number[], onPainted: () => void) {
  const addHighlight = useApp((s) => s.addHighlight);
  const clearHighlights = useApp((s) => s.clearHighlights);
  const ref = chapter?.ref;
  const verses = chapter ? chapter.verses.filter((v) => selected.includes(v.number)) : [];
  /** The first verse selected: the one notes are kept against. */
  const verse = verses[0];
  const numbers = verses.map((v) => v.number);
  const covering = useApp((s) =>
    ref && selected.length > 0 ? highlightsFor(s, ref).filter((h) => selected.some((n) => covers(h, n))) : NO_HIGHLIGHTS,
  );
  // The colour every selected verse is already highlighted in, if there is one.
  const whole = covering.filter((h) => !h.text);
  const tones = numbers.map((n) => whole.filter((h) => covers(h, n)).at(-1)?.color ?? (whole.some((h) => covers(h, n)) ? 'a2' : null));
  const color: Tone | null = tones.length > 0 && tones.every((t) => t !== null && t === tones[0]) ? (tones[0] ?? null) : null;
  const highlighted = covering.length > 0;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const paint = (tone: Tone) => {
    if (!ref || !verse) return;
    const at = { bookId: ref.bookId, chapter: ref.chapter };
    // A phrase dragged inside one verse is highlighted on its own, alongside any others in that verse.
    const picked = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';
    window.getSelection()?.removeAllRanges();
    if (verses.length === 1 && picked.length > 2 && verse.text.includes(picked)) {
      addHighlight({ ...at, verseStart: verse.number, verseEnd: verse.number, text: picked, color: tone });
      onPainted();
      return;
    }
    // Otherwise the selected verses are highlighted whole. Choosing the colour they already have clears it.
    clearHighlights(ref.bookId, ref.chapter, numbers, 'whole');
    if (color !== tone) {
      for (const [verseStart, verseEnd] of verseRanges(numbers)) addHighlight({ ...at, verseStart, verseEnd, color: tone });
    }
    onPainted();
  };

  const clear = () => {
    if (!ref) return;
    clearHighlights(ref.bookId, ref.chapter, numbers);
    onPainted();
  };

  const share = async () => {
    if (!ref || !verse || !chapter) return;
    const reference = versesLabel(ref.bookId, ref.chapter, numbers);
    const text = `“${verses.map((v) => v.text).join(' ')}” — ${reference} (${chapter.edition.short})`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // The share sheet was dismissed.
    }
  };

  return { verse, verses, color, highlighted, paint, clear, share, copied };
}

function VerseToolbar({
  label, color, highlighted, copied, onPaint, onClear, onNote, onShare, onExplain,
}: {
  /** What is selected, e.g. `John 3:16–18`. */
  label: string;
  color: Tone | null;
  /** Any of the selected verses carries highlighting. */
  highlighted: boolean;
  copied: boolean;
  onPaint: (tone: Tone) => void;
  onClear: () => void;
  onNote: () => void;
  onShare: () => void;
  onExplain: () => void;
}) {
  const action = 'hover-dim rounded-full px-[10px] py-[9px] md:px-[14px]';
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="gs fixed bottom-[92px] left-1/2 z-20 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 rounded-full bg-btn p-[6px] text-[14px] font-semibold text-btn-text shadow-[0_12px_28px_rgba(0,0,0,.22)] lg:absolute lg:bottom-7"
    >
      <span className="flex px-[6px]">
        {HIGHLIGHTERS.map((tone, i) => {
          const on = color === tone;
          return (
            <button
              key={tone}
              type="button"
              aria-pressed={on}
              aria-label={on ? 'Remove highlight' : `Highlight, colour ${i + 1}`}
              title={on ? 'Remove highlight' : 'Highlight'}
              // Keeps a phrase selected in the text while the colour is chosen.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPaint(tone)}
              className="hover-dim flex h-9 w-[26px] items-center justify-center rounded-full"
            >
              <span
                className={cx(
                  'h-4 w-4 rounded-full border border-btn-text/30',
                  TONE_BG[tone],
                  on && 'ring-2 ring-btn-text ring-offset-2 ring-offset-btn',
                )}
              />
            </button>
          );
        })}
        {highlighted ? (
          <button
            type="button"
            aria-label="Clear highlighting"
            title="Clear highlighting"
            onClick={onClear}
            className="hover-dim flex h-9 w-[30px] items-center justify-center rounded-full"
          >
            <Ico icon={Eraser} size={16} />
          </button>
        ) : null}
      </span>
      <button type="button" onClick={onNote} className={action}>Note</button>
      <button type="button" onClick={onShare} className={action}>
        <span role="status">{copied ? 'Copied' : 'Share'}</span>
      </button>
      <button type="button" onClick={onExplain} className="hover-dim inline-flex items-center gap-[7px] rounded-full bg-a1 px-3 py-[9px] text-on-a md:px-4">
        <Ico icon={Sparkles} size={15} />
        Explain
      </button>
    </div>
  );
}

function NoteEditor({
  chapter, verse, onDone, onAccent,
}: { chapter: ChapterText; verse: Verse; onDone: () => void; onAccent?: boolean }) {
  const id = useId();
  const existing = useApp((s) => notesFor(s, chapter.ref).find((n) => n.verseStart === verse.number));
  const saveNote = useApp((s) => s.saveNote);
  const [text, setText] = useState(existing?.text ?? '');
  const save = () => {
    saveNote({ bookId: chapter.ref.bookId, chapter: chapter.ref.chapter, verseStart: verse.number, verseEnd: verse.number, text });
    onDone();
  };
  return (
    <div>
      <label htmlFor={id} className={cx('mn block', onAccent ? 'mt-3 text-on-am' : 'text-muted')}>
        Note on {verseLabel(chapter.ref.bookId, chapter.ref.chapter, verse.number)}
      </label>
      <textarea
        id={id}
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What is this verse saying to you?"
        className={cx(
          'gs mt-2 block w-full resize-none rounded-[16px] p-[14px] text-[15px] leading-[1.55]',
          onAccent ? 'bg-white text-on-a placeholder:text-on-am' : 'bg-inset text-ink',
        )}
      />
      <div className="mt-3 flex gap-2">
        <Pill variant={onAccent ? 'dark' : 'primary'} onClick={save} className="px-[18px] py-[10px] text-[14px]">
          {existing && !text.trim() ? 'Delete note' : 'Save'}
        </Pill>
        <Pill variant={onAccent ? 'white' : 'inset'} onClick={onDone} className="px-[18px] py-[10px] text-[14px]">Cancel</Pill>
      </div>
    </div>
  );
}

function TypeSettings() {
  const reader = useApp((s) => s.reader);
  const setReader = useApp((s) => s.setReader);
  return (
    <div>
      <div className="mn text-muted">Text size</div>
      <Segmented
        items={SIZES}
        value={String(reader.scale)}
        onChange={(id) => setReader({ scale: Number(id) })}
        label="Text size"
        stretch
        className="mt-[10px] [&>button]:px-2"
      />
      <div className="mn mt-6 text-muted">Line spacing</div>
      <Segmented
        items={SPACINGS}
        value={String(reader.spacing)}
        onChange={(id) => setReader({ spacing: Number(id) })}
        label="Line spacing"
        stretch
        className="mt-[10px] [&>button]:px-2"
      />
    </div>
  );
}

function ExcerptNote({ chapter }: { chapter: ChapterText }) {
  if (!chapter.excerpt) return null;
  return (
    <div className="mt-7 max-w-[640px] rounded-[20px] bg-inset px-[18px] py-4">
      <p className="gs text-[14px] leading-[1.5] text-muted">
        Excerpt from the {chapter.edition.short}. The complete text will appear here once licensed.
      </p>
      <Pill href={`${chapterHref(chapter.ref)}?edition=dra`} variant="ghost" className="mt-3 px-[15px] py-[9px] text-[13px]">
        Read the full chapter in Douay-Rheims
      </Pill>
    </div>
  );
}

/* ---------- study cards ---------- */

function StudyTitle({ children }: { children: string }) {
  return <h2 className="bq text-[20px] leading-[1.1] font-bold tracking-[-.03em]">{children}</h2>;
}

type ExplainState = ReturnType<typeof useExplain>['state'];

function ExplainCard({ state, onExplain, ref }: { state: ExplainState | null; onExplain: () => void; ref?: Ref<HTMLDivElement> }) {
  const content = state?.status === 'done' ? state.result.content : state?.status === 'streaming' ? state.content : '';
  const done = state?.status === 'done' ? state.result : undefined;
  return (
    <Card as="section" surface="a6" ref={ref} aria-label="Lumen explains" className="scroll-mt-24 p-6">
      <div className="flex items-center gap-[10px]">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-a1 text-on-a">
          <Ico icon={Sparkles} size={16} />
        </span>
        <StudyTitle>Lumen explains</StudyTitle>
      </div>
      {!state || state.status === 'idle' ? (
        <p className="gs mt-[14px] text-[15px] leading-[1.6] text-on-am">Select a verse and tap Explain.</p>
      ) : state.status === 'error' ? (
        <div className="mt-[14px]">
          <p role="alert" className="gs text-[15px] leading-[1.6]">{state.message}</p>
          <TextAction onClick={onExplain} className="mt-3 underline underline-offset-4">Try again</TextAction>
        </div>
      ) : content ? (
        <div aria-live="polite">
          {parseLumenBlocks(content).map((block, i) => (
            <p key={i} className={cx('gs text-[15px] leading-[1.6]', i === 0 ? 'mt-[14px]' : 'mt-[10px]')}>{block.text}</p>
          ))}
        </div>
      ) : (
        <div role="status" aria-label="Lumen is answering" className="mt-[18px] flex flex-col gap-3">
          <Skeleton className="h-4 w-full bg-[rgba(18,18,18,.12)]" />
          <Skeleton className="h-4 w-[88%] bg-[rgba(18,18,18,.12)]" />
          <Skeleton className="h-4 w-[62%] bg-[rgba(18,18,18,.12)]" />
        </div>
      )}
      {done && done.citations.length > 0 ? (
        <div className="mt-[14px] flex flex-wrap gap-[6px]">
          {done.citations.map((c) => (
            <span key={`${c.type}-${c.reference}`} className="gs rounded-full bg-white px-[11px] py-[6px] text-[12px] font-semibold text-on-a">
              {c.reference}
            </span>
          ))}
        </div>
      ) : null}
      {done?.demo ? <div className="mn mt-3 text-on-am">Demo answer</div> : null}
    </Card>
  );
}

/** `Genesis 1:3` → the reader at that verse, when the book is one we carry. */
function referenceHref(reference: string): string | undefined {
  const match = /^(.+?) (\d+)(?::(\d+))?/.exec(reference);
  const book = match ? BIBLE_BOOKS.find((b) => b.name === match[1]) : undefined;
  if (!match || !book) return undefined;
  return `/scripture/${book.id}/${match[2]}${match[3] ? `?verse=${match[3]}` : ''}`;
}

function CrossReferences({ citations }: { citations: Citation[] }) {
  const references = citations.filter((c) => c.type === 'Scripture');
  if (references.length === 0) return null;
  const row = 'flex justify-between gap-4 rounded-[14px] bg-inset px-[14px] py-3 text-[14px]';
  return (
    <Card as="section" aria-label="Cross references" className="p-6">
      <StudyTitle>Cross references</StudyTitle>
      <ul className="gs mt-[14px] flex flex-col gap-2">
        {references.map((c) => {
          const href = referenceHref(c.reference);
          const body = (
            <>
              <b className="font-bold text-ink">{c.reference}</b>
              <span className="text-right text-muted">{c.description}</span>
            </>
          );
          return (
            <li key={c.reference}>
              {href ? <Link href={href} className={cx('hover-dim', row)}>{body}</Link> : <div className={row}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function NoteCard({
  chapter, verse, editing, onDone,
}: { chapter: ChapterText; verse: Verse; editing: boolean; onDone: () => void }) {
  const note = useApp((s) => notesFor(s, chapter.ref).find((n) => n.verseStart === verse.number));
  return (
    <Card as="section" surface="a4" aria-label="My note" className="p-6 lg:flex-1">
      <div className="flex items-baseline justify-between gap-3">
        <StudyTitle>My note</StudyTitle>
        <span className="mn">v.{verse.number}</span>
      </div>
      {editing ? (
        <NoteEditor chapter={chapter} verse={verse} onDone={onDone} onAccent />
      ) : note ? (
        <p className="gs mt-[10px] text-[15px] leading-[1.55] whitespace-pre-line">{note.text}</p>
      ) : (
        <p className="gs mt-[10px] text-[15px] leading-[1.55] text-on-am">Add a note to this verse.</p>
      )}
    </Card>
  );
}

/* ---------- reader ---------- */

/** Long titles step down so that no single word outgrows the reading panel. */
function titleSize(title: string): string {
  const longest = Math.max(...title.split(' ').map((word) => word.length));
  if (longest <= 7) return 'text-[52px] md:text-[72px] lg:text-[64px] xl:text-[88px]';
  if (longest <= 10) return 'text-[40px] md:text-[60px] lg:text-[52px] xl:text-[68px]';
  return 'text-[32px] md:text-[52px] lg:text-[44px] xl:text-[56px]';
}

export function Reader({ chapterRef, edition, verse: target }: { chapterRef: ChapterRef; edition?: EditionId; verse?: number }) {
  const wide = useIsWide();
  const router = useRouter();
  const book = getBook(chapterRef.bookId);
  const { load, retry } = useChapter(chapterRef, edition);
  const chapter = load.status === 'ready' ? load.chapter : undefined;

  const setReading = useApp((s) => s.setReading);
  const bookmarked = useApp((s) => isBookmarked(s, chapterRef));
  const toggleBookmark = useApp((s) => s.toggleBookmark);

  const chapterKey = `${chapterRef.bookId}/${chapterRef.chapter}`;
  const isSample = chapterRef.bookId === 'JHN' && chapterRef.chapter === 1;
  // The design opens John 1 with verse 4 under study; a link to a verse opens on that verse.
  const [picked, setPicked] = useState<{ key: string; verses: number[] } | null>(null);
  const key = `${chapterKey}/${target ?? ''}`;
  const opening = useMemo(() => (target ? [target] : wide && isSample ? [4] : []), [target, wide, isSample]);
  const selected = picked?.key === key ? picked.verses : opening;
  const select = useCallback((verses: number[]) => setPicked({ key, verses }), [key]);

  const [sheet, setSheet] = useState<'type' | 'books' | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  // Once a highlight is made the selection is released, so the next one can be started straight away.
  const { verse, verses, color, highlighted, paint, clear, share, copied } = useVerseActions(chapter, selected, () => select([]));
  const listen = useListen(chapter, `${chapterKey}/${chapter?.edition.id ?? ''}`);

  const seeded = useMemo(
    () => ({ [verseLabel('JHN', 1, 4)]: { ...DEMO_ANSWERS.EXPLAIN_JOHN_1_4, demo: false } }),
    [],
  );
  const { state: explainState, explain, show } = useExplain(seeded);
  const reference = verse ? versesLabel(chapterRef.bookId, chapterRef.chapter, verses.map((v) => v.number)) : '';
  const explained = reference && explainState.reference === reference ? explainState : null;
  const editingNote = Boolean(reference) && noteFor === reference;

  const scroller = useRef<HTMLDivElement>(null);
  const explainCard = useRef<HTMLDivElement>(null);

  const known = Boolean(book && chapterRef.chapter >= 1 && chapterRef.chapter <= book.chapters);
  useEffect(() => {
    if (known) setReading({ bookId: chapterRef.bookId, chapter: chapterRef.chapter });
  }, [known, chapterRef.bookId, chapterRef.chapter, setReading]);

  useEffect(() => {
    if (reference) show(reference);
  }, [reference, show]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [chapterKey]);

  useEffect(() => {
    if (!target || !chapter) return;
    scroller.current?.querySelector(`[data-verse="${target}"]`)?.scrollIntoView({ block: 'center' });
  }, [target, chapter]);

  const prev = adjacentChapter(chapterRef, -1);
  const next = adjacentChapter(chapterRef, 1);

  const runExplain = () => {
    if (!verse) return;
    void explain({ reference, text: verses.map((v) => v.text).join(' ') });
    // Below the desktop layout the study cards sit under the text.
    if (!wide) explainCard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Horizontal swipe turns the chapter on touch screens.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const to = dx < 0 ? next : prev;
    if (to) router.push(chapterHref(to));
  };

  if (!book) {
    return (
      <Page>
        <Card className="p-[26px]">
          <EmptyState>That book could not be found.</EmptyState>
          <Pill href="/scripture" className="mt-4 px-[18px] py-[11px] text-[14px]">Open the Bible</Pill>
        </Card>
      </Page>
    );
  }

  const closeSheet = () => setSheet(null);
  const closeNote = () => setNoteFor(null);

  return (
    <Page fill>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-[220px_minmax(0,1fr)_290px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <Card as="aside" aria-label="Books" className="hidden min-h-0 overflow-hidden p-5 lg:block">
          <BookBrowser current={chapterRef} className="h-full" />
        </Card>

        <Card
          as="section"
          aria-label="Reading"
          className="relative flex min-h-0 min-w-0 flex-col lg:overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div ref={scroller} className={cx('min-h-0 flex-1 p-5 md:p-8 lg:overflow-y-auto xl:px-[60px] xl:py-[34px]', verse && 'pb-24 md:pb-24 xl:pb-24')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="mn min-h-[31px] rounded-full bg-inset px-3 py-2 text-ink">{chapter?.edition.short ?? '…'}</span>
                <Pill variant="inset" aria-label="Type settings" onClick={() => setSheet('type')} className="px-3 py-[6px] text-[14px]">Aa</Pill>
                <Pill variant="inset" icon={LibraryBig} iconSize={15} onClick={() => setSheet('books')} className="px-3 py-[6px] text-[14px] lg:hidden">
                  Books
                </Pill>
              </div>
              <div className="flex items-center gap-2">
                {listen.supported && chapter ? (
                  <Pill
                    icon={listen.speaking ? Square : Headphones}
                    iconSize={15}
                    aria-pressed={listen.speaking}
                    onClick={listen.toggle}
                    className="px-[15px] py-[9px] text-[13px]"
                  >
                    {listen.speaking ? 'Stop' : `Listen · ${listen.minutes} min`}
                  </Pill>
                ) : null}
                <CircleButton
                  icon={Bookmark}
                  variant="inset"
                  size={38}
                  iconSize={16}
                  label={bookmarked ? 'Remove bookmark' : 'Bookmark this chapter'}
                  aria-pressed={bookmarked}
                  fill={bookmarked ? 'currentColor' : 'none'}
                  onClick={() => toggleBookmark(chapterRef)}
                />
              </div>
            </div>

            <div className="mn mt-7 text-a1 md:mt-9">{book.kicker}</div>
            <h1 className={cx('bq mt-[6px] leading-[.9] font-bold tracking-[-.04em] break-words text-ink', titleSize(book.title))}>
              {book.title} <span className="tracking-normal">{chapterRef.chapter}</span>
            </h1>
            {chapter?.title ? <div className="gs mt-[10px] text-[15px] text-muted">{chapter.title}</div> : null}

            {load.status === 'loading' ? (
              <SkeletonLines lines={9} className="mt-7 max-w-[640px]" />
            ) : load.status === 'error' ? (
              <div className="mt-7 max-w-[640px]">
                <EmptyState>{load.message}</EmptyState>
                {load.retry ? <Pill variant="inset" onClick={retry} className="mt-4 px-[18px] py-[10px] text-[14px]">Try again</Pill> : null}
              </div>
            ) : (
              <>
                <Scripture chapter={load.chapter} selected={selected} onSelect={select} />
                <ExcerptNote chapter={load.chapter} />
              </>
            )}

            <nav aria-label="Previous and next chapter" className="mt-10 flex max-w-[640px] flex-wrap items-center justify-between gap-2">
              {prev ? (
                <Pill href={chapterHref(prev)} variant="inset" icon={ChevronLeft} iconSize={15} className="py-[10px] pr-4 pl-3 text-[13px]">
                  {chapterLabel(prev)}
                </Pill>
              ) : <span />}
              {next ? (
                <Pill href={chapterHref(next)} variant="inset" iconAfter={ChevronRight} iconSize={15} className="py-[10px] pr-3 pl-4 text-[13px]">
                  {chapterLabel(next)}
                </Pill>
              ) : <span />}
            </nav>
          </div>

          {verse ? (
            <VerseToolbar
              label={reference}
              color={color}
              highlighted={highlighted}
              copied={copied}
              onPaint={paint}
              onClear={clear}
              onNote={() => setNoteFor(reference)}
              onShare={share}
              onExplain={runExplain}
            />
          ) : null}
        </Card>

        <div className="no-scrollbar flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
          <ExplainCard ref={explainCard} state={explained} onExplain={runExplain} />
          {explained?.status === 'done' ? <CrossReferences citations={explained.result.citations} /> : null}
          {verse && chapter ? (
            <NoteCard key={reference} chapter={chapter} verse={verse} editing={editingNote && wide} onDone={closeNote} />
          ) : null}
        </div>
      </div>

      <Sheet open={sheet === 'type'} onClose={closeSheet} title="Type">
        <TypeSettings />
      </Sheet>
      <Sheet open={sheet === 'books' && !wide} onClose={closeSheet} title="Books">
        <BookBrowser current={chapterRef} onNavigate={closeSheet} className="h-[68dvh]" />
      </Sheet>
      <Sheet open={editingNote && !wide && Boolean(chapter && verse)} onClose={closeNote} title="My note">
        {chapter && verse ? <NoteEditor key={reference} chapter={chapter} verse={verse} onDone={closeNote} /> : null}
      </Sheet>
    </Page>
  );
}
