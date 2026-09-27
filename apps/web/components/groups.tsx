'use client';

import { GROUP_NAME, groupsToJoin, memberCount, myGroups, type Group, type Tone } from '@catalysis/api';
import { Plus, Trash2, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useApp } from '@/lib/store';
import { Avatar, cx, EmptyState, Field, Ico, Pill, Sheet, TextAction } from './ui';

export const GROUP_TONES: Tone[] = ['a2', 'a5', 'a3', 'a4'];
export const groupTone = (id: string): Tone => {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return GROUP_TONES[sum % GROUP_TONES.length] ?? 'a2';
};

const members = (count: number) => `${count} ${count === 1 ? 'member' : 'members'}`;

export function JoinButton({ group, onSolid, size = 'small' }: { group: Group; onSolid?: boolean; size?: 'small' | 'large' }) {
  const joined = useApp((s) => s.joinedGroupIds.includes(group.id));
  const toggleGroup = useApp((s) => s.toggleGroup);
  return (
    <Pill
      variant={joined ? (onSolid ? 'onSolid' : 'ghost') : onSolid ? 'highlight' : 'primary'}
      aria-pressed={joined}
      aria-label={joined ? `Leave ${group.name}` : `Join ${group.name}`}
      onClick={() => toggleGroup(group.id)}
      className={size === 'large' ? 'w-full p-[14px] text-[15px]' : 'px-[14px] py-2 text-[13px]'}
    >
      {joined ? 'Joined' : size === 'large' ? 'Join group' : 'Join'}
    </Pill>
  );
}

export function GroupRow({ group, onOpen }: { group: Group; onOpen?: (group: Group) => void }) {
  const count = useApp((s) => memberCount(s, group));
  const mine = useApp((s) => Boolean(group.ownerId) && s.user?.id === group.ownerId);
  const body = (
    <>
      <Avatar name={group.name} tone={groupTone(group.id)} size={44} shape="square" />
      <span className="gs min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-semibold text-ink">{group.name}</span>
        <span className="mt-[2px] block truncate text-[13px] text-muted">
          {members(count)}{mine ? ' · started by you' : ''}{group.description ? ` · ${group.description}` : ''}
        </span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 rounded-[18px] bg-inset px-[14px] py-3">
      {onOpen ? (
        <button type="button" onClick={() => onOpen(group)} aria-label={`Open ${group.name}`} className="hover-dim flex min-w-0 flex-1 items-center gap-3">{body}</button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      <JoinButton group={group} />
    </li>
  );
}

/** Starting a group. The founder joins it, and can close it later. */
export function CreateGroupForm({ onCreated }: { onCreated: (group: Group) => void }) {
  const createGroup = useApp((s) => s.createGroup);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = createGroup({ name, description });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated(result.group);
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field
        id="group-name"
        label="Name"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
        placeholder="Thursday Rosary Walk"
        maxLength={GROUP_NAME.max}
        error={error}
        autoComplete="off"
      />
      <label htmlFor="group-about" className="mn mt-[18px] block text-muted">What it is for (optional)</label>
      <textarea
        id="group-about"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="When you meet, who it is for."
        rows={3}
        maxLength={200}
        className="gs mt-2 block w-full resize-none rounded-[16px] bg-inset px-[18px] py-[14px] text-[16px] leading-[1.45] text-ink"
      />
      <p className="gs mt-3 text-[13px] leading-[1.5] text-subtle">Anyone in Catalysis can find and join the group. Posts made in it are seen by everyone.</p>
      <Pill type="submit" icon={Plus} className="mt-5 w-full p-[15px] text-[15px]">Start the group</Pill>
    </form>
  );
}

/** Groups to find and join, with a way to start one. */
export function GroupsSheet({
  open, onClose, onOpen, start = 'find',
}: { open: boolean; onClose: () => void; onOpen?: (group: Group) => void; start?: 'find' | 'create' }) {
  const mine = useApp((s) => myGroups(s));
  const others = useApp((s) => groupsToJoin(s));
  const [creating, setCreating] = useState(start === 'create');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (g: Group) => !q || `${g.name} ${g.description ?? ''}`.toLowerCase().includes(q);
  const open_ = onOpen ? (group: Group) => { onOpen(group); onClose(); } : undefined;

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'Start a group' : 'Groups'}>
      {creating ? (
        <>
          <CreateGroupForm onCreated={(group) => { open_?.(group); if (!open_) onClose(); }} />
          <Pill variant="ghost" onClick={() => setCreating(false)} className="mt-[10px] w-full p-[13px] text-[15px]">Find a group instead</Pill>
        </>
      ) : (
        <>
          <Pill icon={Plus} onClick={() => setCreating(true)} className="w-full p-[14px] text-[15px]">Start a group</Pill>
          <label className="mt-4 flex items-center gap-[10px] rounded-full bg-inset px-4">
            <Ico icon={Users} size={15} className="text-subtle" />
            <span className="sr-only">Search groups</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search groups" className="gs min-w-0 flex-1 py-[11px] text-[14px] text-ink" />
          </label>
          {mine.filter(match).length > 0 ? (
            <>
              <h3 className="mn mt-5 mb-[10px] text-muted">Your groups</h3>
              <ul className="flex flex-col gap-[10px]">{mine.filter(match).map((g) => <GroupRow key={g.id} group={g} onOpen={open_} />)}</ul>
            </>
          ) : null}
          <h3 className="mn mt-5 mb-[10px] text-muted">To join</h3>
          {others.filter(match).length === 0 ? (
            <EmptyState className="text-[14px]">{q ? 'No group matches.' : 'You have joined every group. Start a new one.'}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-[10px]">{others.filter(match).map((g) => <GroupRow key={g.id} group={g} onOpen={open_} />)}</ul>
          )}
        </>
      )}
    </Sheet>
  );
}

/** Shown above a group's feed: what the group is, who is in it, and joining or closing it. */
export function GroupHeader({ group, onClosed }: { group: Group; onClosed: () => void }) {
  const count = useApp((s) => memberCount(s, group));
  const mine = useApp((s) => Boolean(group.ownerId) && s.user?.id === group.ownerId);
  const owner = useApp((s) => (group.ownerId ? (s.user?.id === group.ownerId ? 'you' : s.people.find((p) => p.id === group.ownerId)?.name) : undefined));
  const deleteGroup = useApp((s) => s.deleteGroup);
  const [confirming, setConfirming] = useState(false);
  return (
    <section aria-label={group.name} className={cx('flex flex-col gap-4 rounded-[28px] bg-solid p-[22px] text-on-solid md:p-6')}>
      <div className="flex items-start gap-4">
        <Avatar name={group.name} tone={groupTone(group.id)} size={56} shape="square" />
        <div className="min-w-0 flex-1">
          <h2 className="bq text-[26px] leading-[1.05] font-bold tracking-[-.035em] break-words text-white md:text-[30px]">{group.name}</h2>
          <p className="gs mt-[6px] text-[14px] text-on-solid-muted">
            {members(count)}{owner ? ` · started by ${owner}` : ''}
          </p>
        </div>
        <JoinButton group={group} onSolid />
      </div>
      {group.description ? <p className="gs text-[15px] leading-[1.5] text-on-solid">{group.description}</p> : null}
      {mine ? (
        confirming ? (
          <div className="gs flex flex-wrap items-center gap-4 text-[13px] text-on-solid-muted">
            Close this group for everyone? Its posts stay in the feed.
            <TextAction onClick={() => { deleteGroup(group.id); onClosed(); }} className="text-a2">Close the group</TextAction>
            <TextAction onClick={() => setConfirming(false)} className="text-white">Keep it</TextAction>
          </div>
        ) : (
          <TextAction onClick={() => setConfirming(true)} className="inline-flex items-center gap-[6px] self-start text-on-solid-muted">
            <Ico icon={Trash2} size={14} />
            Close the group
          </TextAction>
        )
      ) : null}
    </section>
  );
}
