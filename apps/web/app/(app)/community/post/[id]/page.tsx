'use client';

import { commentsFor, relativeTime, visiblePosts, type Comment } from '@catalysis/api';
import { ArrowUp } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PostCard } from '@/components/community';
import { PersonLink, portraitOf, usePerson, usePortrait } from '@/components/people';
import { BackLink, Page } from '@/components/shell';
import { Avatar, Card, CardTitle, EmptyState, Ico, toneFor } from '@/components/ui';
import { useNow } from '@/lib/hooks';
import { useApp } from '@/lib/store';

function ReplyForm({ postId }: { postId: string }) {
  const name = useApp((s) => s.user?.name ?? '');
  const addComment = useApp((s) => s.addComment);
  const portrait = usePortrait();
  const [reply, setReply] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    addComment(postId, reply);
    setReply('');
  };

  return (
    <form onSubmit={submit} className="gs flex items-center gap-3 rounded-full bg-inset py-2 pr-2 pl-[10px]">
      <Avatar name={name} tone="a3" size={38} media={portrait} />
      <input
        aria-label="Write a reply"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Write a reply…"
        className="min-w-0 flex-1 text-[15px] text-ink"
      />
      <button
        type="submit"
        aria-label="Send reply"
        title="Send reply"
        disabled={!reply.trim()}
        className="hover-dim flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-a1 text-on-a disabled:opacity-40"
      >
        <Ico icon={ArrowUp} size={18} />
      </button>
    </form>
  );
}

function Reply({ comment, now }: { comment: Comment; now: Date }) {
  const author = usePerson(comment.authorId);
  return (
    <li className="flex gap-3">
      <PersonLink id={comment.authorId} label={`${comment.authorName}’s profile`}>
        <Avatar name={comment.authorName} tone={toneFor(comment.authorId)} size={36} media={portraitOf(author)} />
      </PersonLink>
      <div className="gs min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <PersonLink id={comment.authorId} className="truncate text-[15px] font-semibold text-ink">{comment.authorName}</PersonLink>
          <span className="shrink-0 text-[13px] text-subtle">{relativeTime(comment.createdAt, now, 'short')}</span>
        </div>
        <p className="mt-1 text-[15px] leading-[1.55] whitespace-pre-line text-ink">{comment.body}</p>
      </div>
    </li>
  );
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const now = useNow();
  const post = useApp((s) => visiblePosts(s).find((p) => p.id === id));
  const comments = useApp((s) => commentsFor(s, id));
  const earlier = post ? post.replyCount - comments.length : 0;

  return (
    <Page>
      <div className="mx-auto flex max-w-[760px] flex-col">
        <div><BackLink href="/community">Community</BackLink></div>
        <h1 className="sr-only">Post</h1>
        {post ? (
          <div className="flex flex-col gap-[14px]">
            <PostCard post={post} now={now} standalone />
            <Card as="section" aria-label="Replies" className="px-5 py-5 md:px-6 md:py-[22px]">
              <CardTitle className="text-[22px]">Replies</CardTitle>
              {comments.length === 0 ? (
                <EmptyState className="mt-3">No replies yet. Offer a word of encouragement.</EmptyState>
              ) : (
                <ul className="mt-4 flex flex-col gap-[18px]">
                  {comments.map((comment) => <Reply key={comment.id} comment={comment} now={now} />)}
                </ul>
              )}
              {earlier > 0 ? (
                <p className="gs mt-4 rounded-[16px] bg-inset px-4 py-3 text-[13px] leading-[1.5] text-muted">
                  {earlier} earlier {earlier === 1 ? 'reply is' : 'replies are'} not shown.
                </p>
              ) : null}
            </Card>
            <ReplyForm postId={id} />
          </div>
        ) : (
          <Card className="px-6 py-[22px]">
            <EmptyState>This post is no longer available.</EmptyState>
          </Card>
        )}
      </div>
    </Page>
  );
}
