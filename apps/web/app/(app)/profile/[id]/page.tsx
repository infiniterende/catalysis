'use client';

import { compactCount, followerCount, postsBy, type Person } from '@catalysis/api';
import { Ban, Flag, MoreHorizontal } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PostCard } from '@/components/community';
import { GroupRow } from '@/components/groups';
import { FollowButton, portraitOf, usePerson } from '@/components/people';
import { BackLink, Page } from '@/components/shell';
import { Card, CardTitle, Chip, CircleButton, EmptyState, initials, PageTitle, Photo, Sheet, SheetAction } from '@/components/ui';
import { useNow } from '@/lib/hooks';
import { useApp } from '@/lib/store';

function Header({ person }: { person: Person }) {
  const router = useRouter();
  const followers = useApp((s) => followerCount(s, person));
  const followsMe = useApp((s) => s.followerIds.includes(person.id));
  const blockUser = useApp((s) => s.blockUser);
  const [menu, setMenu] = useState(false);
  const portrait = portraitOf(person);
  const about = [person.handle, person.parish].filter(Boolean).join(' · ');
  return (
    <Card as="section" aria-label="Profile" className="flex flex-col gap-5 p-[22px] md:p-[26px] lg:col-span-8">
      <div className="flex items-start gap-5 md:gap-7">
        <div className="h-[120px] w-[96px] shrink-0 overflow-hidden rounded-[24px] md:h-[176px] md:w-[140px]">
          {portrait ? (
            <Photo media={portrait} label={`Portrait of ${person.name}`} className="h-full w-full" />
          ) : (
            <span aria-hidden className="bq flex h-full w-full items-center justify-center bg-a5 text-[40px] font-bold text-on-a md:text-[56px]">{initials(person.name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mn text-muted">Member</span>
              {followsMe ? <Chip tone="a3">Follows you</Chip> : null}
            </div>
            <CircleButton icon={MoreHorizontal} variant="inset" label={`More options for ${person.name}`} onClick={() => setMenu(true)} />
          </div>
          <h1 className="bq mt-1 text-[32px] leading-[.98] font-bold tracking-[-.035em] break-words text-ink md:text-[52px]">{person.name}</h1>
          {about ? <p className="gs mt-3 text-[14px] leading-[1.5] text-muted">{about}</p> : null}
          <div className="gs mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-muted">
            <FollowButton person={person} size="large" />
            <span><strong className="bq text-[18px] font-extrabold text-ink">{compactCount(followers)}</strong> {followers === 1 ? 'follower' : 'followers'}</span>
            {person.followingCount !== undefined ? (
              <span><strong className="bq text-[18px] font-extrabold text-ink">{compactCount(person.followingCount)}</strong> following</span>
            ) : null}
          </div>
        </div>
      </div>
      <Sheet open={menu} onClose={() => setMenu(false)} title={person.name}>
        <SheetAction danger icon={Ban} onClick={() => { blockUser(person.id); router.replace('/community'); }}>Block {person.name}</SheetAction>
        <p className="gs mt-4 flex gap-2 text-[13px] leading-[1.5] text-subtle">
          <Flag width={14} height={14} strokeWidth={2} aria-hidden className="mt-[2px] shrink-0" />
          Blocking hides their posts and replies from you. To report something they shared, use the menu on that post.
        </p>
      </Sheet>
    </Card>
  );
}

export default function MemberPage() {
  const { id: raw } = useParams<{ id: string }>();
  const id = decodeURIComponent(raw);
  const router = useRouter();
  const now = useNow();
  const mine = useApp((s) => s.user?.id === id);
  const blocked = useApp((s) => s.blockedUserIds.includes(id));
  const person = usePerson(id);
  const posts = useApp((s) => postsBy(s, id));
  const groups = useApp((s) => s.groups.filter((g) => g.ownerId === id));

  useEffect(() => {
    if (mine) router.replace('/profile');
  }, [mine, router]);
  if (mine) return null;

  if (!person || blocked) {
    return (
      <Page>
        <BackLink href="/community">Community</BackLink>
        <PageTitle>Member not found</PageTitle>
        <EmptyState className="mt-4">{blocked ? 'You have blocked this member.' : 'That member could not be found.'}</EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <BackLink href="/community">Community</BackLink>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Header person={person} />
        <Card surface="a6" className="p-[26px] lg:col-span-4">
          <figure className="flex h-full min-h-[150px] flex-col justify-between gap-6">
            <blockquote className="bq text-[22px] leading-[1.2] font-normal md:text-[24px]">
              {person.quote ? `“${person.quote.text}”` : `${person.name.split(' ')[0]} has not added a favourite quote yet.`}
            </blockquote>
            {person.quote?.attribution ? <figcaption className="mn">{person.quote.attribution}</figcaption> : null}
          </figure>
        </Card>

        {groups.length > 0 ? (
          <Card as="section" aria-label="Groups started" className="p-[22px] md:p-[26px] lg:col-span-12">
            <CardTitle>Groups {person.name.split(' ')[0]} started</CardTitle>
            <ul className="mt-4 grid grid-cols-1 gap-[10px] lg:grid-cols-2">
              {groups.map((group) => <GroupRow key={group.id} group={group} onOpen={(g) => router.push(`/community?group=${encodeURIComponent(g.id)}`)} />)}
            </ul>
          </Card>
        ) : null}

        <section aria-labelledby="their-posts" className="lg:col-span-12">
          <h2 id="their-posts" className="bq mb-3 text-[24px] leading-[1.1] font-bold tracking-[-.03em] text-ink">Posts</h2>
          {posts.length === 0 ? (
            <Card className="px-6 py-[22px]"><EmptyState>Nothing shared lately.</EmptyState></Card>
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {posts.map((post) => <PostCard key={post.id} post={post} now={now} />)}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
