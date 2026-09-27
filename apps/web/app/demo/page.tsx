'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAccount, useApp } from '@/lib/store';

/** Opens the demo account and goes to Home. Someone already signed in keeps their own account. */
export default function DemoPage() {
  const router = useRouter();
  const account = useAccount();
  const hydrated = useApp((s) => s.hydrated);
  const signedIn = useApp((s) => s.user !== null);

  useEffect(() => {
    if (!hydrated || account.backend === 'checking') return;
    if (!signedIn) account.startDemo();
    router.replace('/today');
  }, [hydrated, signedIn, account, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg" role="status">
      <p className="gs text-[15px] text-muted">Opening the demo…</p>
    </main>
  );
}
