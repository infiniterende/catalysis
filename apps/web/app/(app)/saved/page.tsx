'use client';

import { chapterLabel, lumenPlainText, verseLabel } from '@catalysis/api';
import { ArrowRight, Bookmark, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BackLink, Page } from '@/components/shell';
import { Card, CardTitle, Chip, cx, EmptyState, Ico, PageTitle, TextAction, TONE_BG } from '@/components/ui';
import { useApp } from '@/lib/store';

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <Card as="section" aria-label={title} className="p-[22px] md:p-[26px]">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <Chip tone="inset">{count}</Chip>
      </div>
      <ul className="mt-4 flex flex-col gap-[10px]">{children}</ul>
    </Card>
  );
}

const ROW = 'flex items-start gap-3 rounded-[16px] bg-inset px-4 py-[14px]';
const TITLE = 'gs block text-[15px] font-semibold text-ink';
const EXCERPT = 'gs mt-1 block text-[14px] leading-[1.5] text-muted';

export default function SavedPage() {
  const highlights = useApp((s) => s.highlights);
  const notes = useApp((s) => s.notes);
  const bookmarks = useApp((s) => s.bookmarks);
  const conversations = useApp((s) => s.conversations);
  const deleteNote = useApp((s) => s.deleteNote);
  const removeHighlights = useApp((s) => s.removeHighlights);
  const setActive = useApp((s) => s.setActiveConversation);

  const answers = conversations.flatMap((c) => c.messages.filter((m) => m.saved).map((m) => ({ conversation: c, message: m })));
  const empty = highlights.length + notes.length + bookmarks.length + answers.length === 0;
  const href = (bookId: string, chapter: number) => `/scripture/${bookId}/${chapter}`;

  return (
    <Page>
      <div className="mx-auto max-w-[820px]">
        <BackLink href="/profile">Profile</BackLink>
        <PageTitle accent="for later">Saved</PageTitle>

        <div className="mt-6 flex flex-col gap-4">
          {empty ? (
            <Card className="p-[22px] md:p-[26px]">
              <EmptyState>Nothing saved yet. Highlight a verse or add a note as you read.</EmptyState>
            </Card>
          ) : null}

          {highlights.length > 0 ? (
            <Group title="Highlights" count={highlights.length}>
              {highlights.map((h) => (
                <li key={h.id} className={ROW}>
                  <span aria-hidden className={cx('mt-[5px] h-3 w-3 shrink-0 rounded-full', TONE_BG[h.color ?? 'a2'])} />
                  <Link href={href(h.bookId, h.chapter)} className="hover-dim min-w-0 flex-1">
                    <span className={TITLE}>{verseLabel(h.bookId, h.chapter, h.verseStart, h.verseEnd)}</span>
                    {h.text ? <span className="nr mt-1 block text-[16px] leading-[1.5] text-muted">{h.text}</span> : null}
                  </Link>
                  <TextAction onClick={() => removeHighlights(h.bookId, h.chapter, h.verseStart)} className="shrink-0 text-muted">Remove</TextAction>
                </li>
              ))}
            </Group>
          ) : null}

          {notes.length > 0 ? (
            <Group title="Notes" count={notes.length}>
              {notes.map((n) => (
                <li key={n.id} className={ROW}>
                  <Link href={href(n.bookId, n.chapter)} className="hover-dim min-w-0 flex-1">
                    <span className={TITLE}>{verseLabel(n.bookId, n.chapter, n.verseStart, n.verseEnd)}</span>
                    <span className={cx(EXCERPT, 'whitespace-pre-line')}>{n.text}</span>
                  </Link>
                  <TextAction onClick={() => deleteNote(n.id)} className="shrink-0 text-muted">Delete</TextAction>
                </li>
              ))}
            </Group>
          ) : null}

          {bookmarks.length > 0 ? (
            <Group title="Bookmarks" count={bookmarks.length}>
              {bookmarks.map((b) => (
                <li key={`${b.bookId}-${b.chapter}`}>
                  <Link href={href(b.bookId, b.chapter)} className={cx(ROW, 'hover-dim items-center')}>
                    <Ico icon={Bookmark} size={16} className="text-a1" fill="currentColor" />
                    <span className={cx(TITLE, 'min-w-0 flex-1')}>{chapterLabel(b)}</span>
                    <span className="gs inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-muted">
                      Read
                      <Ico icon={ArrowRight} size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </Group>
          ) : null}

          {answers.length > 0 ? (
            <Group title="From Lumen" count={answers.length}>
              {answers.map(({ conversation, message }) => (
                <li key={message.id}>
                  <Link href="/lumen" onClick={() => setActive(conversation.id)} className={cx(ROW, 'hover-dim')}>
                    <Ico icon={Sparkles} size={16} className="mt-[3px] text-a1" />
                    <span className="min-w-0 flex-1">
                      <span className={TITLE}>{conversation.title}</span>
                      <span className={cx(EXCERPT, 'line-clamp-2')}>{lumenPlainText(message.content)}</span>
                    </span>
                    <Ico icon={ArrowRight} size={15} className="mt-[3px] text-muted" />
                  </Link>
                </li>
              ))}
            </Group>
          ) : null}
        </div>
      </div>
    </Page>
  );
}
