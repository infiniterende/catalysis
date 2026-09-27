'use client';

import {
  groupFor, prayedCount, relativeTime, type Audience, type Group, type Media, type Post, type PostType, type VerseRef,
} from '@catalysis/api';
import { Ban, Flag, HandHeart, Image as ImageIcon, MessageCircle, MoreHorizontal, Send, Trash2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { preparePhoto, savePhoto } from '@/lib/media';
import { useApp } from '@/lib/store';
import { PersonLink, usePortrait } from './people';
import {
  Avatar, Card, Chip, CircleButton, cx, FieldError, Ico, Photo, Pill, Sheet, SheetAction, TextAction, toneFor,
} from './ui';

export function postMeta(post: Post, group: Group | undefined, now: Date, style: 'long' | 'short'): string {
  const where = group?.shortName ?? (post.type === 'request' ? 'Intention' : 'Reflection');
  return `${where} · ${relativeTime(post.createdAt, now, style)}`;
}

export { usePortrait } from './people';

export function VerseCard({ verse, className }: { verse: VerseRef; className?: string }) {
  return (
    <div className={cx('rounded-[18px] bg-inset px-[18px] py-4', className)}>
      <p className="nr text-[17px] leading-[1.5] text-ink">“{verse.text}”</p>
      <Chip tone="a3" className="mt-[10px]">{verse.label}</Chip>
    </div>
  );
}

async function sharePost(post: Post): Promise<string> {
  const url = `${window.location.origin}/community/post/${post.id}`;
  const text = post.body ?? post.pullQuote ?? 'A reflection on Catalysis';
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return '';
    }
    await navigator.clipboard.writeText(url);
    return 'Link copied.';
  } catch {
    return '';
  }
}

/** Report and block, required on every post. */
function PostMenu({ post, open, onClose }: { post: Post; open: boolean; onClose: () => void }) {
  const reportPost = useApp((s) => s.reportPost);
  const blockUser = useApp((s) => s.blockUser);
  const mine = useApp((s) => s.user?.id === post.authorId);
  const [reported, setReported] = useState(false);

  if (reported) {
    const done = () => {
      reportPost(post.id);
      onClose();
    };
    return (
      <Sheet open={open} onClose={done} title="Reported">
        <p className="gs text-[16px] leading-[1.55] text-muted">Thank you. This post has been hidden and sent for review.</p>
        <Pill onClick={done} className="mt-5 w-full p-[14px] text-[15px]">Done</Pill>
      </Sheet>
    );
  }
  return (
    <Sheet open={open} onClose={onClose} title={post.authorName}>
      {mine ? (
        <SheetAction danger icon={Trash2} onClick={() => { reportPost(post.id); onClose(); }}>Remove my post</SheetAction>
      ) : (
        <>
          <SheetAction danger icon={Flag} onClick={() => setReported(true)}>Report post</SheetAction>
          <SheetAction icon={Ban} onClick={() => { blockUser(post.authorId); onClose(); }}>Block {post.authorName}</SheetAction>
        </>
      )}
    </Sheet>
  );
}

const ACTION = 'px-[15px] py-[9px] text-[14px]';

/** A post in a feed. `standalone` is the post at the top of its own thread. */
export function PostCard({ post, now, standalone }: { post: Post; now: Date; standalone?: boolean }) {
  const prayed = useApp((s) => s.prayedPostIds.includes(post.id));
  const count = useApp((s) => prayedCount(s, post));
  const togglePrayed = useApp((s) => s.togglePrayed);
  const portrait = usePortrait(post.authorId);
  const group = useApp((s) => groupFor(s, post.groupId));
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');

  const share = async () => {
    const message = await sharePost(post);
    if (!message) return;
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const request = post.type === 'request';
  const replies = `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}`;

  return (
    <Card
      as="article"
      aria-label={`Post by ${post.authorName}`}
      className={cx('grid grid-cols-1 px-5 py-5 md:px-6 md:py-[22px]', post.media && 'md:grid-cols-[1fr_190px] md:grid-rows-[1fr_auto] md:gap-x-5')}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <PersonLink id={post.authorId} label={`${post.authorName}’s profile`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={post.authorName} tone={toneFor(post.authorId)} media={portrait} />
            <span className="gs block min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{post.authorName}</span>
              <span className="block truncate text-[13px] text-subtle">{postMeta(post, group, now, 'short')}</span>
            </span>
          </PersonLink>
          {request ? <Chip tone="a6" className="hidden px-3 py-[6px] font-bold sm:inline-flex">Prayer request</Chip> : null}
          <CircleButton icon={MoreHorizontal} variant="inset" label={`More options for ${post.authorName}’s post`} onClick={() => setMenu(true)} />
        </div>
        {request ? <Chip tone="a6" className="mt-3 px-3 py-[6px] font-bold sm:hidden">Prayer request</Chip> : null}
        {post.pullQuote ? <p className="bq mt-[14px] text-[28px] leading-[1.05] font-normal text-ink md:text-[34px]">{post.pullQuote}</p> : null}
        {post.body ? (
          <p className={cx('gs whitespace-pre-line', post.pullQuote ? 'mt-2 text-[15px] leading-[1.5] text-muted' : 'mt-[14px] text-[16px] leading-[1.55] text-ink md:text-[17px]')}>
            {post.body}
          </p>
        ) : null}
        {post.verse ? <VerseCard verse={post.verse} className="mt-[14px]" /> : null}
      </div>

      {post.media ? (
        <Photo
          media={post.media}
          label={`Photo from ${post.authorName}`}
          className="mt-[14px] h-[200px] rounded-[20px] md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:h-auto md:min-h-[190px]"
        />
      ) : null}

      <div className="gs mt-4 flex flex-wrap items-center gap-2">
        <Pill
          variant={prayed ? 'highlight' : 'inset'}
          icon={HandHeart}
          iconSize={15}
          aria-pressed={prayed}
          onClick={() => togglePrayed(post.id)}
          className={ACTION}
        >
          I prayed · {count}
        </Pill>
        {standalone ? (
          <span aria-label={replies} className={cx('inline-flex items-center gap-2 rounded-full bg-inset font-semibold text-ink', ACTION)}>
            <Ico icon={MessageCircle} size={15} />
            {post.replyCount}
          </span>
        ) : (
          <Pill href={`/community/post/${post.id}`} variant="inset" icon={MessageCircle} iconSize={15} aria-label={`${replies}, open the thread`} className={ACTION}>
            {post.replyCount}
          </Pill>
        )}
        <Pill variant="inset" icon={Send} iconSize={15} onClick={share} className={ACTION}>Share</Pill>
        {notice ? <span role="status" className="text-[13px] font-medium text-muted">{notice}</span> : null}
      </div>

      <PostMenu post={post} open={menu} onClose={() => setMenu(false)} />
    </Card>
  );
}

/** The composer at the top of a feed. Posts to the group when one is open. */
export function ComposeBar({ groupId }: { groupId?: string }) {
  const name = useApp((s) => s.user?.name ?? '');
  const addPost = useApp((s) => s.addPost);
  const portrait = usePortrait();
  const [body, setBody] = useState('');
  const [request, setRequest] = useState(false);
  const [photo, setPhoto] = useState<{ media: Media; name: string } | null>(null);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    setError('');
    try {
      const url = await savePhoto(await preparePhoto(picked));
      setPhoto({ media: { kind: 'image', url }, name: picked.name });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That photo could not be added.');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const type: PostType = request ? 'request' : photo ? 'photo' : 'reflection';
    const audience: Audience = groupId ? 'parish' : 'everyone';
    const post = addPost({ type, body, media: photo?.media, groupId, audience });
    if (!post) {
      setError('Write a few words first.');
      return;
    }
    setBody('');
    setPhoto(null);
    setRequest(false);
    setError('');
  };

  return (
    <form onSubmit={submit} aria-label="New post">
      <div className="gs flex items-center gap-2 rounded-full bg-inset py-2 pr-2 pl-[10px] md:gap-3">
        <Avatar name={name} tone="a3" size={38} media={portrait} />
        <input
          aria-label="Share a reflection, photo or intention"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'compose-error' : undefined}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a reflection, photo or intention…"
          className="min-w-0 flex-1 text-[15px] text-ink"
        />
        <button
          type="button"
          aria-label={photo ? 'Replace the photo' : 'Add a photo'}
          title={photo ? 'Replace the photo' : 'Add a photo'}
          onClick={() => file.current?.click()}
          className={cx('hover-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full', photo ? 'text-a1' : 'text-muted')}
        >
          <Ico icon={ImageIcon} size={19} />
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
        <Pill type="submit" className="px-5 py-[11px] text-[14px]">Post</Pill>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-[10px]">
        <Pill
          variant={request ? 'highlight' : 'ghost'}
          icon={HandHeart}
          iconSize={14}
          aria-pressed={request}
          onClick={() => setRequest((v) => !v)}
          className="px-3 py-[6px] text-[13px]"
        >
          Intention
        </Pill>
        {photo ? (
          <div className="flex min-w-0 flex-1 items-center gap-[10px]">
            <Photo media={photo.media} className="h-10 w-10 shrink-0 rounded-[12px]" />
            <span className="gs min-w-0 flex-1 truncate text-[13px] text-muted">{photo.name}</span>
            <TextAction onClick={() => setPhoto(null)} className="text-muted">Remove</TextAction>
          </div>
        ) : null}
      </div>
      <div className="px-[10px]"><FieldError id="compose-error">{error}</FieldError></div>
    </form>
  );
}
