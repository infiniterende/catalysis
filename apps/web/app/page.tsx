'use client';

import {
  allEvents, defaultEditionShort, formatHour, formatTime12, MONTHS_SHORT, nextEvent, parseISODate, PIZZA_AND_PEWS,
} from '@catalysis/api';
import { ArrowRight, Flame, HandHeart, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo, ThemeToggle } from '@/components/shell';
import { Card, cx, Ico, Pill } from '@/components/ui';
import { useToday } from '@/lib/hooks';
import { ASSETS } from '@/lib/media';
import { useApp } from '@/lib/store';

const SIGN_UP = '/login?mode=signup';
const IOS_APP_URL = process.env.NEXT_PUBLIC_IOS_APP_URL;

const NAV = [
  { label: 'Scripture', href: '/scripture' },
  { label: 'Prayer', href: '/prayer' },
  { label: 'Community', href: '/community' },
  { label: 'Reels', href: '/reels' },
  { label: 'Lumen AI', href: '/lumen' },
];

const MARQUEE: { word: string; star: string }[] = [
  { word: 'scripture', star: 'var(--a1)' }, { word: 'prayer', star: 'var(--a2)' },
  { word: 'community', star: 'var(--a4)' }, { word: 'reels', star: 'var(--a3)' },
  { word: 'events', star: 'var(--a1)' }, { word: 'lumen ai', star: 'var(--a2)' },
  { word: 'rosary', star: 'var(--a4)' }, { word: 'adoration', star: 'var(--a3)' },
  { word: 'saints', star: 'var(--a1)' }, { word: 'testimony', star: 'var(--a2)' },
];

/** Signed-out visitors are sent to sign up first; the link remembers where they were going. */
const gate = (href: string) => `${SIGN_UP}&next=${encodeURIComponent(href)}`;

const photo = (src: string, position: string) => ({ background: `#121212 url('${src}') ${position} / cover no-repeat` });

function Collage() {
  return (
    <div aria-hidden className="relative mx-auto h-[380px] w-full max-w-[560px] md:h-[580px]">
      <div className="absolute top-0 left-1/2 h-[580px] w-[560px] origin-top -translate-x-1/2 scale-[.62] sm:scale-[.66] md:scale-100">
        <div className="absolute top-[10px] left-[10px] h-[450px] w-[330px] -rotate-3 rounded-[30px] shadow-[0_20px_40px_rgba(0,0,0,.18)]" style={photo(ASSETS.angel, '50% 30%')} />
        <div className="absolute top-10 right-[10px] h-[330px] w-[250px] rotate-[4deg] rounded-[26px] shadow-[0_20px_40px_rgba(0,0,0,.18)]" style={photo(ASSETS.stJoseph, '50% 25%')}>
          <div className="gs absolute bottom-[14px] left-[14px] flex items-center gap-[7px] rounded-full bg-[rgba(18,18,18,.78)] px-[13px] py-2 text-white">
            <Ico icon={Play} size={13} />
            <span className="text-[13px] font-semibold">2.4k views</span>
          </div>
        </div>
        <div className="absolute bottom-[10px] left-[250px] h-[190px] w-[260px] rotate-[-1.5deg] rounded-[24px] border-[5px] border-bg shadow-[0_20px_40px_rgba(0,0,0,.16)]" style={photo(ASSETS.monstrance, '50% 42%')} />
        <div className="gs absolute top-0 right-10 flex rotate-6 items-center gap-2 rounded-full bg-a2 px-[17px] py-[11px] text-[15px] font-bold text-on-a shadow-[0_8px_18px_rgba(0,0,0,.12)]">
          <Ico icon={Flame} size={16} />12-day streak
        </div>
        <div className="absolute bottom-10 left-0 w-[250px] rotate-[2.5deg] rounded-[20px] bg-card px-5 py-[18px] shadow-[0_14px_30px_rgba(0,0,0,.14)]">
          <div className="mn text-a1">Verse of the day</div>
          <div className="bq mt-2 text-[24px] leading-[1.15] text-ink">The light shines in the darkness.</div>
          <div className="gs mt-2 text-[13px] font-semibold text-muted">John 1:5</div>
        </div>
        <div className="bq absolute right-0 bottom-[120px] flex h-[108px] w-[108px] -rotate-[10deg] flex-col items-center justify-center rounded-full bg-a1 text-center text-[17px] leading-[1.05] font-bold text-on-a shadow-[0_10px_22px_rgba(255,90,31,.35)]">
          <Ico icon={Sparkles} size={20} className="mb-1" />
          ask<br />lumen
        </div>
      </div>
    </div>
  );
}

function Marquee() {
  const run = (
    <div className="flex items-center gap-[34px] pr-[34px]">
      {MARQUEE.map((item, i) => (
        <span key={item.word} className="contents">
          <span className={i % 2 === 0 ? 'font-extrabold' : 'font-light italic'}>{item.word}</span>
          {/* The dark theme sets every star in one colour; the light theme cycles the accents. */}
          <span className="font-normal" style={{ color: `var(--mq-star, ${item.star})` }}>✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div aria-hidden className="bq overflow-hidden bg-mq-bg py-5 text-[28px] tracking-[-.03em] whitespace-nowrap text-mq-text md:py-6 md:text-[40px]">
      <div className="marquee flex w-max">{run}{run}</div>
    </div>
  );
}

/** The next Pizza and Pews, so the card always shows a Sunday that is still to come. */
function PizzaAndPews() {
  const { today } = useToday();
  const next = nextEvent(allEvents().filter((e) => e.title === PIZZA_AND_PEWS.title), today);
  const date = next ? parseISODate(next.date) : undefined;
  return (
    <Card surface="a4" className="flex min-h-[270px] flex-col justify-between gap-6 p-7 md:col-span-2">
      <div>
        <h3 className="bq text-[32px] leading-none font-bold tracking-[-.035em]">Never miss<br />{PIZZA_AND_PEWS.title}</h3>
        <p className="gs mt-3 text-[15px] leading-[1.45] text-on-am">Pizza, then prayer. Every Sunday at {formatHour(PIZZA_AND_PEWS.time)}.</p>
      </div>
      <div className="flex items-center gap-4 rounded-[18px] bg-white px-4 py-[14px]">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] bg-on-a text-white" suppressHydrationWarning>
          <span className="mn text-[9px] text-lime" suppressHydrationWarning>{date ? MONTHS_SHORT[date.getMonth()] : 'Sun'}</span>
          <span className="bq text-[24px] leading-none font-bold" suppressHydrationWarning>{date ? date.getDate() : '8'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="gs text-[16px] font-semibold text-on-a">{PIZZA_AND_PEWS.title}</div>
          <div className="gs mt-[2px] text-[13px] text-on-am">
            Sundays · {formatTime12(PIZZA_AND_PEWS.time)} · {PIZZA_AND_PEWS.location} · {PIZZA_AND_PEWS.goingCount} going
          </div>
        </div>
        <Link
          href={gate(next ? `/events?date=${next.date}` : '/events')}
          className="gs hover-dim rounded-full bg-on-a px-[18px] py-[10px] text-[14px] font-semibold text-white"
        >
          RSVP
        </Link>
      </div>
    </Card>
  );
}

const featureTitle = 'bq text-[28px] leading-none font-bold tracking-[-.03em]';

function Features() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:auto-rows-[270px] lg:grid-cols-4">
      <Card className="flex min-h-[270px] flex-col justify-between gap-6 p-7 md:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="bq text-[32px] leading-none font-bold tracking-[-.035em] text-ink">A Bible that<br />explains itself</h3>
          <span className="mn rounded-full bg-inset px-[11px] py-[7px] text-ink" suppressHydrationWarning>{defaultEditionShort()}</span>
        </div>
        <div className="flex flex-col gap-4 rounded-[18px] bg-inset px-[18px] py-4 sm:flex-row sm:items-center">
          <p className="nr flex-1 text-[18px] leading-[1.5] text-ink">
            Through him was life, and <span className="rounded-[5px] bg-a2 box-decoration-clone px-1 py-px text-on-a">this life was the light of the human race.</span>
          </p>
          <span className="gs inline-flex items-center gap-[7px] self-start rounded-full bg-a1 px-[15px] py-[10px] text-[14px] font-semibold whitespace-nowrap text-on-a sm:self-auto">
            <Ico icon={Sparkles} size={14} />Explain
          </span>
        </div>
      </Card>

      <Card surface="a2" className="flex min-h-[270px] flex-col justify-between p-7">
        <h3 className={featureTitle}>Prayer streaks</h3>
        <div>
          <div className="bq text-[96px] leading-[.85] font-extrabold tracking-[-.03em]">12</div>
          <div className="mt-[14px] flex gap-[6px]">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className={cx('h-[10px] flex-1 rounded-full', i < 5 ? 'bg-on-a' : 'bg-[rgba(18,18,18,.18)]')} />
            ))}
          </div>
        </div>
      </Card>

      <Card surface="a1" className="flex min-h-[270px] flex-col justify-between gap-5 p-7">
        <h3 className={featureTitle}>Ask Lumen anything</h3>
        <div className="flex flex-col gap-2">
          <div className="gs self-end rounded-[16px_16px_4px_16px] bg-on-a px-[14px] py-[10px] text-[14px] text-white">Who were the archangels?</div>
          <div className="gs rounded-[16px_16px_16px_4px] bg-white px-[14px] py-[10px] text-[14px] leading-[1.4] text-on-a">
            Michael, Gabriel and Raphael. Their feast is Sept 29 (CCC 335).
          </div>
        </div>
      </Card>

      <Card surface="a3" className="flex min-h-[270px] flex-col justify-between gap-5 p-7">
        <h3 className={featureTitle}>Pray for each other</h3>
        <div>
          <p className="gs text-[15px] leading-[1.45]">“Finals week. Could use prayers for peace and focus.”</p>
          <span className="gs mt-3 inline-flex items-center gap-[7px] rounded-full bg-on-a px-[14px] py-[9px] text-[13px] font-semibold text-white">
            <Ico icon={HandHeart} size={14} />I prayed · 24
          </span>
        </div>
      </Card>

      <div className="relative min-h-[270px] overflow-hidden rounded-[28px]" style={photo(ASSETS.stJoseph, '50% 25%')}>
        <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,0) 40%, rgba(0,0,0,.7))' }} />
        <h3 className={cx(featureTitle, 'absolute top-7 left-7 text-white')}>Reels</h3>
        <p className="gs absolute right-7 bottom-[26px] left-7 text-[15px] leading-[1.4] text-white">Testimonies, saints and 60-second reflections.</p>
      </div>

      <PizzaAndPews />
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const hydrated = useApp((s) => s.hydrated);
  const signedIn = useApp((s) => s.user !== null);

  useEffect(() => {
    if (hydrated && signedIn) router.replace('/today');
  }, [hydrated, signedIn, router]);

  return (
    <div className="bg-bg">
      <div className="mx-auto max-w-[1320px]">
        <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-8 md:py-[22px]">
          <Logo href="/" size="landing" />
          <nav aria-label="Sections" className="gs hidden gap-[34px] text-[15px] font-medium text-ink lg:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={gate(item.href)} className="hover-accent">{item.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 md:gap-[18px]">
            <ThemeToggle />
            <Link href="/login" className="gs hover-accent text-[15px] font-medium whitespace-nowrap text-ink">Log in</Link>
            <Pill href={SIGN_UP} className="hidden px-[22px] py-3 text-[15px] sm:inline-flex">Get the app</Pill>
          </div>
        </header>

        <main>
          <section className="grid items-center gap-6 px-4 pt-6 pb-10 md:px-8 md:pt-9 md:pb-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <Link
                href={gate('/reels')}
                className="gs hover-dim inline-flex items-center gap-[9px] rounded-full border border-line bg-card py-2 pr-[15px] pl-[9px] text-[14px] font-medium text-ink"
              >
                <span className="rounded-full bg-a1 px-[9px] py-[3px] text-[12px] font-bold text-on-a">New</span>
                Reels are here. Share your faith in 60s.
              </Link>
              <h1 className="bq mt-[26px] text-[64px] leading-[.9] font-bold tracking-[-.04em] text-ink md:text-[96px] xl:text-[118px]">
                Grow in faith, <span className="tracking-[-.02em] text-a1">every</span> day.
              </h1>
              <p className="gs mt-[26px] max-w-[520px] text-[17px] leading-[1.55] text-muted md:text-[19px]">
                Daily scripture, prayer streaks, a community that shows up for you, and Lumen, an AI that answers your
                questions from Scripture and the Catechism.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Pill href={SIGN_UP} iconAfter={ArrowRight} className="gap-[10px] px-7 py-[17px] text-[16px]">Start free</Pill>
                <Pill href="/demo" variant="ghost" icon={Play} className="gap-[10px] px-[26px] py-4 text-[16px]">Try the demo</Pill>
              </div>
              <div className="mt-[30px] flex items-center gap-3">
                <div className="flex" aria-hidden>
                  {(['bg-a2', 'bg-a3', 'bg-a4', 'bg-a5'] as const).map((tone, i) => (
                    <div key={tone} className={cx('h-[34px] w-[34px] rounded-full border-[2.5px] border-bg', tone, i > 0 && '-ml-[10px]')} />
                  ))}
                </div>
                <span className="gs text-[14px] text-muted"><b className="text-ink">12k+ students</b> praying daily</span>
              </div>
            </div>
            <Collage />
          </section>
        </main>
      </div>

      <Marquee />

      <div className="mx-auto max-w-[1320px] px-4 pt-14 pb-8 md:px-8 md:pt-[72px]">
        <section id="features" aria-labelledby="features-title" className="scroll-mt-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <h2 id="features-title" className="bq max-w-[760px] text-[40px] leading-[.95] font-bold tracking-[-.03em] text-ink md:text-[64px]">
              Everything your faith life needs, <span className="tracking-[-.01em]">in one app.</span>
            </h2>
            <p className="gs max-w-[300px] text-[16px] leading-[1.5] text-muted">Built with students at Newman Centers across the country.</p>
          </div>
          <Features />
        </section>

        <section className="mt-4 flex flex-col gap-8 rounded-[32px] bg-solid p-8 md:p-14 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="bq text-[40px] leading-[.95] font-bold tracking-[-.03em] text-on-solid md:text-[60px]">
            Your first 7 days<br /><span className="tracking-[-.01em] text-a2">start today.</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            <Pill href={SIGN_UP} variant="highlight" className="px-7 py-[17px] text-[16px]">Start free</Pill>
            {IOS_APP_URL ? (
              <Pill href={IOS_APP_URL} variant="onSolid" className="px-[26px] py-4 text-[16px]">Download for iOS</Pill>
            ) : (
              <Pill href="/demo" variant="onSolid" className="px-[26px] py-4 text-[16px]">Try the demo</Pill>
            )}
          </div>
        </section>

        <footer className="gs flex justify-between px-1 pt-7 pb-1 text-[13px] text-muted">
          <span>© 2026 Catalysis</span>
          <span>Ad Maiorem Dei Gloriam</span>
        </footer>
      </div>
    </div>
  );
}
