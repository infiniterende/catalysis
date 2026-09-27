'use client';

import {
  allTimePrayers, bestStreak, compactCount, computeStreak, followersOf, followingOf, milestonesFor, myGroups, postsBy,
  type Milestone, type Tone, type User,
} from '@catalysis/api';
import { ArrowRight, Camera, Check, NotebookPen, Pencil, Plus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { PostCard } from '@/components/community';
import { GroupRow, GroupsSheet } from '@/components/groups';
import { PeopleSheet } from '@/components/people';
import { Page } from '@/components/shell';
import { Card, CardTitle, Chip, cx, EmptyState, Field, FieldError, Ico, initials, Photo, Pill, Progress, Sheet } from '@/components/ui';
import { useNow, useToday } from '@/lib/hooks';
import { preparePhoto, savePhoto } from '@/lib/media';
import { useAccount, useApp, useAppStore } from '@/lib/store';

function Portrait({ user }: { user: User }) {
  const updateProfile = useApp((s) => s.updateProfile);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    setError('');
    try {
      updateProfile({ portraitUrl: await savePhoto(await preparePhoto(picked, 800)) });
    } catch (problem) {
      setError(problem instanceof Error && problem.message ? problem.message : 'That photo could not be used.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="shrink-0">
      <button
        type="button"
        aria-label={user.portraitUrl ? 'Change portrait' : 'Add a portrait'}
        title={user.portraitUrl ? 'Change portrait' : 'Add a portrait'}
        disabled={busy}
        onClick={() => file.current?.click()}
        className={cx('hover-dim relative block h-[120px] w-[96px] overflow-hidden rounded-[24px] md:h-[176px] md:w-[140px]', busy && 'opacity-60')}
      >
        {user.portraitUrl ? (
          <Photo media={{ kind: 'image', url: user.portraitUrl }} className="h-full w-full" />
        ) : (
          <span className="bq flex h-full w-full items-center justify-center bg-a3 text-[40px] font-bold text-on-a md:text-[56px]">{initials(user.name)}</span>
        )}
        <span aria-hidden className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white">
          <Ico icon={Camera} size={15} />
        </span>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      </button>
      <div className="max-w-[140px]"><FieldError>{error}</FieldError></div>
    </div>
  );
}

function Count({ value, label, onClick }: { value: number; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`${value} ${label}`} className="hover-dim gs rounded-[16px] bg-inset px-4 py-[10px] text-left">
      <span className="bq block text-[22px] leading-none font-extrabold tracking-[-.02em] text-ink">{compactCount(value)}</span>
      <span className="mt-1 block text-[12px] font-semibold text-muted">{label}</span>
    </button>
  );
}

type Panel = 'followers' | 'following' | 'groups' | 'settings' | null;

function ProfileCard({ user, onOpen }: { user: User; onOpen: (panel: Panel) => void }) {
  const followers = useApp((s) => s.followerIds.length);
  const following = useApp((s) => s.followingIds.length);
  const groups = useApp((s) => myGroups(s).length);
  return (
    <Card as="section" aria-label="Profile" className="flex flex-col gap-5 p-[22px] md:col-span-2 md:p-[26px] lg:col-span-8">
      <div className="flex items-start gap-5 md:gap-7">
        <Portrait user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mn text-muted">Profile</span>
            {user.role === 'moderator' ? (
              <Chip tone="a2">
                <Ico icon={ShieldCheck} size={12} />
                Moderator
              </Chip>
            ) : null}
          </div>
          <h1 className="bq mt-2 text-[32px] leading-[.98] font-bold tracking-[-.035em] break-words text-ink md:text-[52px]">{user.name}</h1>
          <div className="gs mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-[1.5] text-muted">
            <span>{user.handle}</span>
            <span aria-hidden>·</span>
            {user.parish && user.parish !== 'Add your parish' ? (
              <span>{user.parish}</span>
            ) : (
              <button type="button" onClick={() => onOpen('settings')} className="hover-dim font-semibold text-a1 underline underline-offset-2">Add your parish</button>
            )}
          </div>
          <Pill variant="ghost" icon={Pencil} iconSize={14} onClick={() => onOpen('settings')} className="mt-4 px-4 py-[10px] text-[14px]">Edit profile</Pill>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Count value={followers} label={followers === 1 ? 'Follower' : 'Followers'} onClick={() => onOpen('followers')} />
        <Count value={following} label="Following" onClick={() => onOpen('following')} />
        <Count value={groups} label={groups === 1 ? 'Group' : 'Groups'} onClick={() => onOpen('groups')} />
      </div>
    </Card>
  );
}

function QuoteCard({ quote, onEdit }: { quote: User['quote']; onEdit: () => void }) {
  if (!quote) {
    return (
      <Card surface="a6" className="flex min-h-[170px] flex-col justify-between gap-6 p-[26px] md:col-span-2 lg:col-span-4">
        <p className="bq text-[22px] leading-[1.2] font-normal">A line you live by: from Scripture, a saint, or your grandmother.</p>
        <Pill variant="dark" icon={Plus} onClick={onEdit} className="self-start px-[18px] py-[11px] text-[14px]">Add a quote</Pill>
      </Card>
    );
  }
  return (
    <Card surface="a6" className="p-[26px] md:col-span-2 lg:col-span-4">
      <figure className="flex h-full min-h-[170px] flex-col justify-between gap-6">
        <blockquote className="bq text-[22px] leading-[1.2] font-normal md:text-[24px]">“{quote.text}”</blockquote>
        {quote.attribution ? <figcaption className="mn">{quote.attribution}</figcaption> : null}
      </figure>
    </Card>
  );
}

function StatCard({ value, label, surface }: { value: number; label: string; surface: Tone }) {
  return (
    <Card surface={surface} className="flex min-h-[124px] min-w-0 flex-col justify-between gap-3 p-[14px] md:min-h-[170px] md:p-[26px]">
      <div className="bq text-[40px] leading-[.85] font-extrabold tracking-[-.03em] md:text-[68px]">{compactCount(value)}</div>
      <div className="gs text-[13px] leading-[1.2] font-semibold md:text-[14px]">{label}</div>
    </Card>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const earned = Boolean(milestone.achieved);
  const progress = milestone.progress;
  return (
    <li className="rounded-[16px] bg-inset px-4 py-[14px]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', earned ? 'bg-btn text-btn-text' : 'border-2 border-faint')}
        >
          {earned ? <Ico icon={Check} size={13} /> : null}
        </span>
        <span className={cx('gs min-w-0 flex-1 text-[15px]', earned ? 'font-semibold text-ink' : 'text-muted')}>
          {milestone.title}
          <span className="sr-only">{earned ? ', achieved' : ', in progress'}</span>
        </span>
        {milestone.achieved ? <Chip tone="a2" className="shrink-0">{milestone.achieved}</Chip> : null}
        {!earned && progress ? <span className="gs shrink-0 text-[13px] font-semibold text-ink">{progress.current} / {progress.total}</span> : null}
      </div>
      {!earned && progress ? (
        <Progress value={progress.total ? progress.current / progress.total : 0} label={`${milestone.title}: ${progress.current} of ${progress.total}`} className="mt-3 bg-card!" />
      ) : null}
    </li>
  );
}

function SettingsSheet({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const updateProfile = useApp((s) => s.updateProfile);
  const { signOut, backend } = useAccount();
  const [name, setName] = useState(user.name);
  const [parish, setParish] = useState(user.parish === 'Add your parish' ? '' : user.parish);
  const [quote, setQuote] = useState(user.quote?.text ?? '');
  const [attribution, setAttribution] = useState(user.quote?.attribution ?? '');
  const [error, setError] = useState('');

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    updateProfile({
      name: name.trim().slice(0, 80),
      parish: parish.trim(),
      // An empty quote takes the quote away.
      quote: { text: quote.trim(), attribution: quote.trim() ? attribution.trim() : '' },
    });
    setError('');
    onClose();
  };

  const logOut = () => {
    void signOut();
    router.replace('/');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={save} noValidate>
        <Field id="profile-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} error={error} autoComplete="name" maxLength={80} />
        <Field id="profile-parish" label="Parish or campus ministry" value={parish} onChange={(e) => setParish(e.target.value)} placeholder="Newman Center, NYU" maxLength={120} className="mt-[18px]" />
        <Field id="profile-quote" label="Favourite quote" value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={400} className="mt-[18px]" />
        <Field id="profile-attribution" label="Who said it" value={attribution} onChange={(e) => setAttribution(e.target.value)} maxLength={120} className="mt-[18px]" />
        <Pill type="submit" className="mt-6 w-full p-[14px] text-[15px]">Save</Pill>
      </form>
      <Pill variant="ghost" onClick={logOut} className="mt-[10px] w-full p-[13px] text-[15px]">Log out</Pill>
      <p className="gs mt-4 text-[13px] leading-[1.5] text-subtle">
        Signed in as {user.email}, {user.handle}.{' '}
        {backend === 'server' ? 'Your name, parish, quote and portrait are shown to other members.' : 'Logging out clears what is kept on this device.'}
      </p>
    </Sheet>
  );
}

function MyGroups({ onFind }: { onFind: () => void }) {
  const router = useRouter();
  const groups = useApp((s) => myGroups(s));
  return (
    <Card as="section" aria-label="Your groups" className="p-[22px] md:p-[26px]">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Groups</CardTitle>
        <Pill variant="ghost" icon={Plus} iconSize={14} onClick={onFind} className="px-[14px] py-2 text-[13px]">Find or start</Pill>
      </div>
      {groups.length === 0 ? (
        <EmptyState className="mt-4">You have not joined a group yet.</EmptyState>
      ) : (
        <ul className="mt-4 flex flex-col gap-[10px]">
          {groups.map((group) => <GroupRow key={group.id} group={group} onOpen={(g) => router.push(`/community?group=${encodeURIComponent(g.id)}`)} />)}
        </ul>
      )}
    </Card>
  );
}

function MyPosts({ userId }: { userId: string }) {
  const now = useNow();
  const posts = useApp((s) => postsBy(s, userId));
  return (
    <section aria-labelledby="my-posts" className="md:col-span-2 lg:col-span-12">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="my-posts" className="bq text-[24px] leading-[1.1] font-bold tracking-[-.03em] text-ink">Your posts</h2>
        <Pill href="/community" variant="ghost" icon={Plus} iconSize={14} className="px-[14px] py-2 text-[13px]">New post</Pill>
      </div>
      {posts.length === 0 ? (
        <Card className="px-6 py-[22px]">
          <EmptyState>Nothing shared yet. A reflection, a photo or an intention you post will appear here.</EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          {posts.map((post) => <PostCard key={post.id} post={post} now={now} />)}
        </div>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { today } = useToday();
  const user = useApp((s) => s.user);
  const logs = useApp((s) => s.prayerLogs);
  const prayers = useApp((s) => allTimePrayers(s));
  const best = useApp((s) => bestStreak(s));
  // Milestones are made afresh from the whole state, so they are worked out here rather than selected.
  const state = useStore(useAppStore());
  const milestones = useMemo(() => milestonesFor(state), [state]);
  const followers = useApp((s) => followersOf(s));
  const following = useApp((s) => followingOf(s));
  const journal = useApp((s) => s.journal.length);
  const [panel, setPanel] = useState<Panel>(null);
  if (!user) return null;

  const streak = computeStreak(logs, today);
  const close = () => setPanel(null);

  return (
    <Page>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <ProfileCard user={user} onOpen={setPanel} />
        <QuoteCard quote={user.quote} onEdit={() => setPanel('settings')} />

        <section aria-label="Your numbers" className="grid grid-cols-3 gap-3 md:col-span-2 md:gap-4 lg:col-span-12">
          <StatCard value={streak} label="Day streak" surface="a2" />
          <StatCard value={prayers} label="Prayers" surface="a3" />
          <StatCard value={Math.max(best, streak)} label="Best streak" surface="a4" />
        </section>

        <Card as="section" aria-label="Milestones" className="p-[22px] md:p-[26px] lg:col-span-7">
          <CardTitle>Milestones</CardTitle>
          <ul className="mt-4 flex flex-col gap-[10px]">
            {milestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)}
          </ul>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <MyGroups onFind={() => setPanel('groups')} />
          <Link href="/saved" className="hover-lift flex min-h-[150px] flex-col justify-between gap-6 rounded-[28px] bg-solid p-[26px] text-on-solid">
            <span className="mn text-a2">Kept for later</span>
            <span className="flex items-end justify-between gap-4">
              <span className="bq text-[28px] leading-none font-bold tracking-[-.035em] text-white">Saved verses<br />&amp; notes</span>
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-a2 text-on-a">
                <Ico icon={ArrowRight} size={19} />
              </span>
            </span>
          </Link>
          <Link href="/prayer/journal" className="hover-lift flex items-center gap-4 rounded-[28px] bg-a4 p-[22px] text-on-a">
            <Ico icon={NotebookPen} size={20} />
            <span className="gs min-w-0 flex-1">
              <span className="bq block text-[20px] font-bold tracking-[-.03em]">Journal</span>
              <span className="block text-[13px]">{journal === 0 ? 'Private to you. Write the first entry.' : `${journal} ${journal === 1 ? 'entry' : 'entries'}, private to you`}</span>
            </span>
            <Ico icon={ArrowRight} size={18} />
          </Link>
        </div>

        <MyPosts userId={user.id} />
      </div>

      <SettingsSheet key={panel === 'settings' ? 'open' : 'closed'} user={user} open={panel === 'settings'} onClose={close} />
      <PeopleSheet open={panel === 'followers'} onClose={close} title="Followers" people={followers} empty="No one follows you yet. Share a reflection, and others will find you." />
      <PeopleSheet open={panel === 'following'} onClose={close} title="Following" people={following} empty="You are not following anyone yet. Find people in Discover." />
      <GroupsSheet
        key={panel === 'groups' ? 'groups-open' : 'groups-closed'}
        open={panel === 'groups'}
        onClose={close}
        onOpen={(g) => router.push(`/community?group=${encodeURIComponent(g.id)}`)}
      />
    </Page>
  );
}
