'use client';

import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { DISCOVER_TABS, DiscoverGrid, type DiscoverTab } from '@/components/reels';
import { Page } from '@/components/shell';
import { CircleButton, PageTitle, Segmented } from '@/components/ui';
import { useIsDesktop } from '@/lib/hooks';

export default function DiscoverPage() {
  const desktop = useIsDesktop();
  const [tab, setTab] = useState<DiscoverTab>('reels');
  return (
    <Page>
      <div className="mx-auto max-w-[900px]">
        <div className="flex items-end justify-between gap-4 pt-1">
          <PageTitle>Discover</PageTitle>
          <CircleButton icon={Search} label="Search" href="/search" />
        </div>
        <div className="mt-5 mb-4 flex">
          <Segmented label="Discover" items={DISCOVER_TABS} value={tab} onChange={setTab} />
        </div>
        <DiscoverGrid tab={tab} scale={desktop ? 1.6 : 1} />
      </div>
      <CircleButton
        icon={Plus}
        label="New post"
        href="/create"
        variant="accent"
        size={56}
        iconSize={24}
        className="fixed right-4 bottom-[104px] z-20 shadow-[0_8px_20px_rgba(0,0,0,.25)] md:right-7 lg:right-9 lg:bottom-9"
      />
    </Page>
  );
}
