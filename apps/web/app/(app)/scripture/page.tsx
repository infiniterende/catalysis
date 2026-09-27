'use client';

import { Reader } from '@/components/reader';
import { useApp } from '@/lib/store';

/** Opens the reader where the user last left off, on every screen size. */
export default function ScripturePage() {
  const reading = useApp((s) => s.reading);
  return <Reader chapterRef={reading} />;
}
