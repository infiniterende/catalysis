'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Reader } from '@/components/reader';

function ReaderRoute() {
  const params = useParams<{ book: string; chapter: string }>();
  const search = useSearchParams();
  const edition = search.get('edition') === 'dra' ? 'dra' : undefined;
  const chapter = Number.parseInt(params.chapter, 10);
  const verse = Number.parseInt(search.get('verse') ?? '', 10);
  return (
    <Reader
      chapterRef={{ bookId: params.book.toUpperCase(), chapter: Number.isFinite(chapter) ? chapter : 1 }}
      edition={edition}
      verse={Number.isFinite(verse) && verse > 0 ? verse : undefined}
    />
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={null}>
      <ReaderRoute />
    </Suspense>
  );
}
