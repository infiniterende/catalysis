'use client';

import { computeStreak } from '@catalysis/api';
import {
  Bell, BookOpen, CalendarDays, Flame, HandHeart, Home, Sparkles, SunMoon, Users, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useToday } from '@/lib/hooks';
import { useAccount, useApp } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { Avatar, CircleButton, cx, EmptyState, Ico, Sheet, Skeleton } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other paths that light this item up. */
  also?: string[];
  accent?: boolean;
}

const NAV: NavItem[] = [
  { href: '/today', label: 'Home', icon: Home, also: ['/profile', '/saved', '/search'] },
  { href: '/scripture', label: 'Bible', icon: BookOpen },
  { href: '/prayer', label: 'Prayer', icon: HandHeart },
  { href: '/community', label: 'Community', icon: Users, also: ['/reels', '/discover'] },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/lumen', label: 'Lumen', icon: Sparkles, accent: true },
];

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const isActive = (pathname: string, item: NavItem) => under(pathname, item.href) || Boolean(item.also?.some((p) => under(pathname, p)));

export function Logo({ href = '/today', size = 'app' }: { href?: string; size?: 'app' | 'landing' }) {
  const big = size === 'landing';
  return (
    <Link href={href} aria-label="Catalysis, home" className="hover-dim flex items-center gap-[10px]">
      <span className={cx('flex items-center justify-center rounded-[11px] bg-logo-bg text-logo-ic', big ? 'h-9 w-9' : 'h-[34px] w-[34px]')}>
        <Ico icon={Flame} size={big ? 19 : 18} />
      </span>
      <span className={cx('bq font-bold tracking-[-.04em] text-ink', big ? 'text-[24px]' : 'text-[22px]')}>catalysis</span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <CircleButton
      icon={SunMoon}
      label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      aria-pressed={theme === 'dark'}
      onClick={toggle}
    />
  );
}

function StreakChip() {
  const { today } = useToday();
  const logs = useApp((s) => s.prayerLogs);
  const streak = computeStreak(logs, today);
  return (
    <Link
      href="/prayer"
      aria-label={`${streak}-day prayer streak`}
      className="gs hover-dim inline-flex items-center gap-[6px] rounded-full bg-a2 px-[14px] py-[9px] text-[14px] font-bold text-on-a"
    >
      <Ico icon={Flame} size={15} />
      {streak}
    </Link>
  );
}

/** Top bar: wordmark, pill navigation (desktop), streak, theme, notifications, profile. */
export function TopBar() {
  const pathname = usePathname();
  const name = useApp((s) => s.user?.name ?? '');
  const portrait = useApp((s) => s.user?.portraitUrl);
  const [bell, setBell] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-bg px-4 py-3 md:px-7 md:py-5">
      <Logo />
      <nav aria-label="Primary" className="gs hidden gap-[2px] rounded-full border border-line bg-card p-[5px] text-[14px] font-medium text-ink lg:flex">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx('inline-flex items-center gap-[6px] rounded-full px-[17px] py-[9px]', active ? 'bg-btn text-btn-text' : 'hover-inset')}
            >
              {item.accent ? <Ico icon={item.icon} size={15} className={active ? '' : 'text-a1'} /> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-[10px]">
        <StreakChip />
        <ThemeToggle />
        <CircleButton icon={Bell} label="Notifications" onClick={() => setBell(true)} />
        <Link href="/profile" aria-label="Your profile" title="Your profile" className="hover-dim">
          <Avatar name={name} tone="a3" size={40} media={portrait ? { kind: 'image', url: portrait } : undefined} />
        </Link>
      </div>
      <Sheet open={bell} onClose={() => setBell(false)} title="Notifications">
        <EmptyState>Nothing new. Peace be with you.</EmptyState>
      </Sheet>
    </header>
  );
}

/** Bottom navigation below the desktop breakpoint. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 px-3 pt-2 lg:hidden"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, var(--bg) 62%, transparent)' }}
    >
      {/* Icons only, except the current page, which carries its name. */}
      <div className="mx-auto flex max-w-[520px] items-center gap-[2px] rounded-full border border-line bg-card p-[5px] shadow-[0_10px_30px_rgba(0,0,0,.12)]">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className={cx(
                'gs flex h-[46px] items-center justify-center gap-2 rounded-full',
                active ? 'bg-btn px-4 text-btn-text' : 'flex-1 text-ink',
              )}
            >
              <Ico icon={item.icon} size={19} className={item.accent && !active ? 'text-a1' : ''} />
              {active ? <span className="text-[13px] leading-none font-semibold">{item.label}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Shown to a visitor trying the demo account, on every screen. */
function DemoBanner() {
  const { guest, signOut } = useAccount();
  const router = useRouter();
  if (!guest) return null;
  return (
    <div role="status" className="gs mx-4 mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] bg-a2 px-4 py-[10px] text-[13px] leading-[1.4] font-medium text-on-a md:mx-7">
      <span className="min-w-0 flex-1">
        <strong className="font-bold">You’re trying the demo.</strong> This is a sample account: nothing you do is saved or seen by anyone.
      </span>
      <Link href="/login?mode=signup" className="hover-dim rounded-full bg-on-a px-[14px] py-[7px] font-semibold text-white">Create an account</Link>
      <button type="button" onClick={() => { void signOut(); router.replace('/'); }} className="hover-dim font-semibold underline underline-offset-2">Leave</button>
    </div>
  );
}

/** Routes that fill the screen and carry their own chrome. */
const BARE = ['/create', '/prayer/guided/'];

function LoadingScreen() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[720px] flex-col gap-4 px-6 pt-24" role="status" aria-label="Loading">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-12 w-3/4" />
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Skeleton className="h-44 rounded-[28px]" />
        <Skeleton className="h-44 rounded-[28px]" />
      </div>
      <Skeleton className="h-40 rounded-[28px]" />
    </div>
  );
}

/** Gate for signed-in routes, plus the navigation chrome. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useApp((s) => s.hydrated);
  const signedIn = useApp((s) => s.user !== null);

  useEffect(() => {
    if (hydrated && !signedIn) router.replace('/');
  }, [hydrated, signedIn, router]);

  if (!hydrated || !signedIn) return <LoadingScreen />;

  if (BARE.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col bg-bg pb-[96px] lg:pb-0">
      <TopBar />
      <DemoBanner />
      {children}
      <BottomNav />
    </div>
  );
}

/**
 * Standard page frame under the top bar. `fill` pins the page to the viewport
 * height on desktop, for screens whose panels scroll on their own.
 */
export function Page({ children, className, fill }: { children: ReactNode; className?: string; fill?: boolean }) {
  return (
    <main
      className={cx(
        'mx-auto w-full max-w-[1320px] flex-1 px-4 pt-1 pb-7 md:px-7',
        fill && 'lg:h-[calc(100dvh-91px)] lg:min-h-[640px] lg:flex-none',
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Link back to the parent page, for pages reached from another. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="gs hover-dim mb-4 inline-flex items-center gap-2 rounded-full bg-inset px-[14px] py-2 text-[13px] font-semibold text-ink">
      ← {children}
    </Link>
  );
}
