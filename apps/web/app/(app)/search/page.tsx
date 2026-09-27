'use client';

import {
  allEvents, BIBLE_BOOKS, formatDayLong, GUIDED_PRAYERS, parseISODate, visiblePosts,
} from '@catalysis/api';
import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BackLink, Page } from '@/components/shell';
import { Card, CardTitle, Chip, EmptyState, Ico, PageTitle } from '@/components/ui';
import { useApp } from '@/lib/store';

interface Hit {
  key: string;
  href: string;
  title: string;
  meta: string;
}

const LIMIT = 6;
const has = (haystack: string | undefined, needle: string) => Boolean(haystack?.toLowerCase().includes(needle));

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const posts = useApp((s) => visiblePosts(s));
  const people = useApp((s) => s.people.filter((p) => !s.blockedUserIds.includes(p.id)));
  const allGroups = useApp((s) => s.groups);
  const q = query.trim().toLowerCase();

  const groups: { title: string; hits: Hit[] }[] = q.length < 2 ? [] : [
    {
      title: 'Scripture',
      hits: BIBLE_BOOKS.filter((b) => has(b.name, q)).map((b) => ({
        key: b.id, href: `/scripture/${b.id}/1`, title: b.name, meta: `${b.chapters} ${b.chapters === 1 ? 'chapter' : 'chapters'}`,
      })),
    },
    {
      title: 'Prayers',
      hits: GUIDED_PRAYERS.filter((g) => has(g.title, q)).map((g) => ({
        key: g.id, href: `/prayer/book/${g.id}`, title: g.title, meta: `${g.minutes} min`,
      })),
    },
    {
      title: 'Events',
      hits: allEvents().filter((e) => has(e.title, q) || has(e.location, q)).map((e) => ({
        key: e.id, href: `/events?date=${e.date}`, title: e.title, meta: formatDayLong(parseISODate(e.date), false),
      })),
    },
    {
      title: 'People',
      hits: people.filter((p) => has(p.name, q) || has(p.handle, q)).map((p) => ({
        key: p.id, href: `/profile/${encodeURIComponent(p.id)}`, title: p.name, meta: [p.handle, p.parish].filter(Boolean).join(' · '),
      })),
    },
    {
      title: 'Groups',
      hits: allGroups.filter((g) => has(g.name, q) || has(g.description, q)).map((g) => ({
        key: g.id, href: `/community?group=${encodeURIComponent(g.id)}`, title: g.name, meta: g.description ?? 'Group',
      })),
    },
    {
      title: 'Community',
      hits: posts.filter((p) => has(p.body, q) || has(p.pullQuote, q) || has(p.authorName, q)).map((p) => ({
        key: p.id, href: `/community/post/${p.id}`, title: p.body ?? p.pullQuote ?? 'Photo', meta: p.authorName,
      })),
    },
  ].filter((g) => g.hits.length > 0);

  return (
    <Page>
      <div className="mx-auto max-w-[820px]">
        <BackLink href="/today">Home</BackLink>
        <PageTitle>Search</PageTitle>

        <div role="search" className="gs mt-6 flex items-center gap-3 rounded-full bg-inset py-[6px] pr-[6px] pl-5 focus-within:ring-2 focus-within:ring-a1">
          <Ico icon={Search} size={19} className="text-muted" />
          <input
            type="search"
            aria-label="Search Catalysis"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scripture, prayers, events, people…"
            className="min-w-0 flex-1 py-[12px] pr-4 text-[17px] text-ink md:text-[18px]"
          />
        </div>

        <div className="mt-5 flex flex-col gap-4" aria-live="polite">
          {q.length < 2 ? (
            <Card className="p-[22px] md:p-[26px]">
              <EmptyState>Search the books of the Bible, guided prayers, events and the community.</EmptyState>
            </Card>
          ) : groups.length === 0 ? (
            <Card className="p-[22px] md:p-[26px]">
              <EmptyState>Nothing found for “{query.trim()}”.</EmptyState>
            </Card>
          ) : (
            groups.map((group) => (
              <Card as="section" key={group.title} aria-label={group.title} className="p-[22px] md:p-[26px]">
                <CardTitle>{group.title}</CardTitle>
                <ul className="mt-4 flex flex-col gap-[10px]">
                  {group.hits.slice(0, LIMIT).map((hit) => (
                    <li key={hit.key}>
                      <Link href={hit.href} className="hover-dim flex items-center gap-3 rounded-[16px] bg-inset px-4 py-[14px]">
                        <span className="gs line-clamp-2 min-w-0 flex-1 text-[15px] font-medium text-ink">{hit.title}</span>
                        <Chip tone="a3" className="max-w-[45%] shrink-0"><span className="truncate">{hit.meta}</span></Chip>
                        <Ico icon={ArrowRight} size={15} className="text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>
      </div>
    </Page>
  );
}
