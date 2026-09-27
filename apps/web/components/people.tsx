'use client';

import { followerCount, personFor, type Media, type Person } from '@catalysis/api';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useApp } from '@/lib/store';
import { Avatar, cx, EmptyState, Pill, Sheet, toneFor } from './ui';

export const profileHref = (id: string, myId?: string) => (id === myId ? '/profile' : `/profile/${encodeURIComponent(id)}`);

export const portraitOf = (person: Pick<Person, 'portraitUrl'> | undefined): Media | undefined =>
  person?.portraitUrl ? { kind: 'image', url: person.portraitUrl } : undefined;

/** A member as others see them, or `undefined` if nothing is known of them. */
export function usePerson(id: string | undefined): Person | undefined {
  return useApp((s) => (id ? personFor(s, id) : undefined));
}

/** A member's portrait. With no id, the signed-in member's own. */
export function usePortrait(id?: string): Media | undefined {
  const url = useApp((s) => {
    const who = id ?? s.user?.id;
    return who ? personFor(s, who)?.portraitUrl : undefined;
  });
  return url ? { kind: 'image', url } : undefined;
}

/** Wraps a name or portrait in a link to the member's profile. */
export function PersonLink({ id, className, children, label }: { id: string; className?: string; children: ReactNode; label?: string }) {
  const myId = useApp((s) => s.user?.id);
  return <Link href={profileHref(id, myId)} aria-label={label} className={cx('hover-dim', className)}>{children}</Link>;
}

export function FollowButton({ person, size = 'small', onSolid }: { person: Pick<Person, 'id' | 'name'>; size?: 'small' | 'large'; onSolid?: boolean }) {
  const on = useApp((s) => s.followingIds.includes(person.id));
  const followsMe = useApp((s) => s.followerIds.includes(person.id));
  const mine = useApp((s) => s.user?.id === person.id);
  const toggleFollow = useApp((s) => s.toggleFollow);
  if (mine) return null;
  return (
    <Pill
      variant={on ? (onSolid ? 'onSolid' : 'ghost') : onSolid ? 'highlight' : 'primary'}
      aria-pressed={on}
      aria-label={on ? `Following ${person.name}` : `Follow ${person.name}`}
      onClick={() => toggleFollow(person.id)}
      className={size === 'large' ? 'px-[22px] py-[12px] text-[15px]' : 'px-[14px] py-2 text-[13px]'}
    >
      {on ? 'Following' : followsMe ? 'Follow back' : 'Follow'}
    </Pill>
  );
}

export function PersonRow({ person }: { person: Person }) {
  const followers = useApp((s) => followerCount(s, person));
  const followsMe = useApp((s) => s.followerIds.includes(person.id));
  const about = [person.handle, person.parish].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 rounded-[18px] bg-inset px-[14px] py-3">
      <PersonLink id={person.id} label={`${person.name}’s profile`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.name} tone={toneFor(person.id)} size={44} media={portraitOf(person)} />
        <span className="gs min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{person.name}</span>
          <span className="mt-[2px] block truncate text-[13px] text-muted">
            {about || `${followers} ${followers === 1 ? 'follower' : 'followers'}`}
            {followsMe ? ' · follows you' : ''}
          </span>
        </span>
      </PersonLink>
      <FollowButton person={person} />
    </li>
  );
}

export function PeopleList({ people, empty }: { people: Person[]; empty: string }) {
  if (people.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="flex flex-col gap-[10px]">
      {people.map((person) => <PersonRow key={person.id} person={person} />)}
    </ul>
  );
}

export function PeopleSheet({ open, onClose, title, people, empty }: { open: boolean; onClose: () => void; title: string; people: Person[]; empty: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <PeopleList people={people} empty={empty} />
    </Sheet>
  );
}
