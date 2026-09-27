'use client';

import {
  activeConversation, chapterLabel, conversationTitle, lumenPlainText, newId, parseLumenBlocks, streamLumen,
  type Citation, type Conversation, type Message, type Tone,
} from '@catalysis/api';
import {
  ArrowUp, Bookmark, BookOpenText, Check, Copy, History as HistoryIcon, Mic, Paperclip, Plus, Sparkles, ThumbsDown,
  ThumbsUp, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode,
} from 'react';
import { Page } from '@/components/shell';
import { Card, Chip, cx, EmptyState, Ico, Pill, Sheet, Skeleton, TextAction, TONE_BG } from '@/components/ui';
import { useIsWide } from '@/lib/hooks';
import { LUMEN_ENDPOINT, lumenHeaders } from '@/lib/lumen';
import { useAccount, useApp, useAppStore } from '@/lib/store';

const DISCLAIMER = 'Lumen is a study aid, not a substitute for a priest or spiritual director.';
const SUGGESTIONS: { text: string; tone: Tone }[] = [
  { text: 'Explain today’s Gospel simply', tone: 'a4' },
  { text: 'A prayer before an exam', tone: 'a3' },
  { text: 'Saints for anxiety', tone: 'a5' },
];

/** A reference in parentheses inside a paragraph: `(Mt 18:22)`, `(CCC 1030–1031)`. */
const CITATION = /\(((?:[1-3] ?)?[A-Z][a-z]+\.? \d+(?::\d+(?:[–-]\d+)?)?|CCC \d+(?:[–-]\d+)?)\)/g;

/* ---------- chat ---------- */

/** Sends a question and streams the answer into the active conversation. */
function useLumenChat() {
  const store = useAppStore();
  const abort = useRef<AbortController | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; question: string } | null>(null);
  /** For a visitor trying the demo: short answers left today, once one has been given. */
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const ask = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || abort.current) return;
    const state = store.getState();
    setError(null);

    let conversation = activeConversation(state);
    const conversationId = conversation?.id ?? state.startConversation();
    conversation = conversation ?? activeConversation(store.getState());
    const history = conversation?.messages ?? [];
    if (history.length === 0) state.renameConversation(conversationId, conversationTitle(text));

    const now = new Date().toISOString();
    const answerId = newId('msg');
    state.appendMessage(conversationId, { id: newId('msg'), role: 'user', content: text, citations: [], followUps: [], createdAt: now });
    state.appendMessage(conversationId, { id: answerId, role: 'assistant', content: '', citations: [], followUps: [], createdAt: now });

    const controller = new AbortController();
    abort.current = controller;
    setStreaming(true);

    let content = '';
    let lastPaint = 0;
    try {
      const result = await streamLumen(
        { mode: 'chat', messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: text }] },
        {
          endpoint: LUMEN_ENDPOINT,
          headers: lumenHeaders(),
          signal: controller.signal,
          onDelta: (delta) => {
            content += delta;
            // Persisted state is written at most ten times a second.
            const t = performance.now();
            if (t - lastPaint < 100) return;
            lastPaint = t;
            store.getState().updateMessage(conversationId, answerId, { content });
          },
        },
      );
      store.getState().updateMessage(conversationId, answerId, {
        content: result.content,
        citations: result.citations,
        followUps: result.followUps,
        demo: result.demo,
      });
      if (result.remaining !== undefined) setRemaining(result.remaining);
    } catch (failure) {
      const conv = store.getState().conversations.find((c) => c.id === conversationId);
      if (conv) {
        // Take back the unanswered turn so the thread stays truthful.
        store.setState({
          conversations: store.getState().conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: c.messages.filter((m) => m.id !== answerId) } : c,
          ),
        });
      }
      if (!controller.signal.aborted) setError({ message: (failure as Error).message, question: text });
    } finally {
      abort.current = null;
      setStreaming(false);
    }
  }, [store]);

  /** Re-asks after a failure, without repeating the question in the thread. */
  const retry = useCallback(() => {
    if (!error) return;
    const state = store.getState();
    const conversation = activeConversation(state);
    const last = conversation?.messages[conversation.messages.length - 1];
    if (conversation && last?.role === 'user' && last.content === error.question) {
      store.setState({
        conversations: state.conversations.map((c) =>
          c.id === conversation.id ? { ...c, messages: c.messages.slice(0, -1) } : c,
        ),
      });
    }
    void ask(error.question);
  }, [ask, error, store]);

  return { ask, retry, streaming, error, remaining, clearError: () => setError(null) };
}

/* ---------- dictation ---------- */

interface DictationResult {
  readonly isFinal: boolean;
  readonly 0?: { readonly transcript: string };
}

interface DictationEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<DictationResult>;
}

interface Dictation {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: DictationEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type DictationCtor = new () => Dictation;

function dictationCtor(): DictationCtor | undefined {
  const scope = window as unknown as { SpeechRecognition?: DictationCtor; webkitSpeechRecognition?: DictationCtor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

const subscribeNever = () => () => undefined;
const canDictate = () => Boolean(dictationCtor());

/** Speech to text with the Web Speech API, where the browser has it. */
function useDictation(onText: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeNever, canDictate, () => false);
  const [listening, setListening] = useState(false);
  const session = useRef<Dictation | null>(null);
  const deliver = useRef(onText);

  useEffect(() => {
    deliver.current = onText;
  });
  useEffect(() => () => session.current?.abort(), []);

  const toggle = () => {
    if (session.current) {
      session.current.stop();
      return;
    }
    const Recognition = dictationCtor();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let heard = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) heard += result[0]?.transcript ?? '';
      }
      if (heard.trim()) deliver.current(heard.trim());
    };
    const finish = () => {
      session.current = null;
      setListening(false);
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    session.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      finish();
    }
  };

  return { supported, listening, toggle };
}

/* ---------- thread ---------- */

function withCitations(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <span key={at} className="rounded-full bg-a3 px-2 py-[3px] text-[12px] font-semibold whitespace-nowrap text-on-a">
        {match[1]}
      </span>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function IconAction({
  icon, label, active, filled, pressed, onClick,
}: { icon: LucideIcon; label: string; active?: boolean; filled?: boolean; pressed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cx('hover-accent relative flex h-8 w-8 items-center justify-center rounded-full after:absolute after:-inset-1', active ? 'text-ink' : 'text-subtle')}
    >
      <Ico icon={icon} size={16} fill={filled ? 'currentColor' : 'none'} />
    </button>
  );
}

function Answer({ message, live }: { message: Message; live: boolean }) {
  const updateMessage = useApp((s) => s.updateMessage);
  const conversationId = useApp((s) => s.activeConversationId);
  const [copied, setCopied] = useState(false);
  const blocks = parseLumenBlocks(message.content);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lumenPlainText(message.content));
      setCopied(true);
    } catch {
      // Clipboard unavailable.
    }
  };
  const patch = (change: Partial<Message>) => {
    if (conversationId) updateMessage(conversationId, message.id, change);
  };
  const rate = (feedback: 'up' | 'down') => patch({ feedback: message.feedback === feedback ? undefined : feedback });

  return (
    <div className="max-w-full md:max-w-[88%]">
      <div aria-live={live ? 'polite' : undefined} aria-busy={live}>
        {blocks.length === 0 ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Lumen is answering">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          blocks.map((block, i) =>
            block.kind === 'quote' ? (
              <blockquote key={i} className="my-[14px] rounded-[20px] bg-a4 px-5 py-[18px] text-on-a">
                <p className="bq text-[22px] leading-[1.2] font-normal md:text-[26px]">{block.text}</p>
                {block.citation ? (
                  <cite className="mt-[10px] block not-italic">
                    <Chip tone="white">{block.citation}</Chip>
                  </cite>
                ) : null}
              </blockquote>
            ) : (
              <p key={i} className={cx('gs text-[16px] leading-[1.65] text-ink', i > 0 && blocks[i - 1]?.kind !== 'quote' && 'mt-3')}>
                {withCitations(block.text)}
              </p>
            ),
          )
        )}
      </div>
      {live || blocks.length === 0 ? null : (
        <div className="mt-2 -ml-2 flex items-center gap-[2px]">
          <IconAction icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy the answer'} active={copied} onClick={copy} />
          <IconAction
            icon={Bookmark}
            label={message.saved ? 'Remove from saved' : 'Save the answer'}
            pressed={Boolean(message.saved)}
            active={Boolean(message.saved)}
            filled={Boolean(message.saved)}
            onClick={() => patch({ saved: !message.saved })}
          />
          <IconAction icon={ThumbsUp} label="Helpful" pressed={message.feedback === 'up'} active={message.feedback === 'up'} onClick={() => rate('up')} />
          <IconAction icon={ThumbsDown} label="Not helpful" pressed={message.feedback === 'down'} active={message.feedback === 'down'} onClick={() => rate('down')} />
          {message.demo ? <span className="mn ml-3 text-subtle">Demo answer</span> : null}
        </div>
      )}
    </div>
  );
}

/** Outlined pill for a suggested question. Long ones wrap rather than overflow. */
function Outlined({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="gs hover-inset rounded-full border border-line px-[15px] py-[9px] text-left text-[14px] font-medium text-ink">
      {children}
    </button>
  );
}

function Intro({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="m-auto flex max-w-[460px] flex-col items-center py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-a1 text-on-a">
        <Ico icon={Sparkles} size={26} />
      </span>
      <h2 className="bq mt-5 text-[32px] leading-none font-bold tracking-[-.03em] text-ink md:text-[40px]">Ask Lumen</h2>
      <p className="gs mt-3 text-[15px] leading-[1.5] text-muted">Answers from Scripture and the Catechism, with sources.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Outlined key={s.text} onClick={() => onAsk(s.text)}>{s.text}</Outlined>
        ))}
      </div>
    </div>
  );
}

/* ---------- side panels ---------- */

function History({
  conversations, activeId, busy, onPick, onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  busy: boolean;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const listed = conversations.filter((c) => c.messages.length > 0);
  if (listed.length === 0) return <EmptyState className="px-2">Your conversations will be kept here.</EmptyState>;
  return (
    <ul className="gs flex flex-col gap-[2px] text-[14px] text-ink">
      {listed.map((c) => {
        const on = c.id === activeId;
        return (
          <li key={c.id} className={cx('flex items-center gap-2 rounded-[14px]', on ? 'border border-line bg-card font-semibold' : 'hover-dim')}>
            <button
              type="button"
              aria-current={on ? 'true' : undefined}
              onClick={() => onPick(c.id)}
              className="min-w-0 flex-1 truncate px-3 py-[11px] text-left"
            >
              {c.title}
            </button>
            {on ? (
              <TextAction disabled={busy} aria-label={`Delete “${c.title}”`} onClick={() => onDelete(c.id)} className="mr-3 text-muted">
                Delete
              </TextAction>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Sidebar({
  conversations, activeId, busy, onNew, onPick, onDelete, onAsk,
}: {
  conversations: Conversation[];
  activeId: string | null;
  busy: boolean;
  onNew: () => void;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onAsk: (question: string) => void;
}) {
  return (
    <>
      <Pill icon={Plus} onClick={onNew} className="w-full p-[14px] text-[15px]">New chat</Pill>
      <h2 className="mn mt-[22px] mb-[10px] ml-2 text-muted">This week</h2>
      <History conversations={conversations} activeId={activeId} busy={busy} onPick={onPick} onDelete={onDelete} />
      <h2 className="mn mt-[22px] mb-[10px] ml-2 text-muted">Try asking</h2>
      <div className="gs flex flex-col gap-2 text-[13px] font-medium">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            type="button"
            disabled={busy}
            onClick={() => onAsk(s.text)}
            className={cx('hover-dim rounded-[14px] px-3 py-[10px] text-left text-on-a disabled:opacity-40', TONE_BG[s.tone])}
          >
            {s.text}
          </button>
        ))}
      </div>
    </>
  );
}

const sourceTone = (type: Citation['type']): Tone => (type === 'Scripture' ? 'a3' : type === 'Catechism' ? 'a4' : 'a5');

function Sources({ citations }: { citations: Citation[] }) {
  return (
    <>
      {citations.length === 0 ? (
        <EmptyState className="px-1">Sources will be listed here with each answer.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {citations.map((c) => (
            <li key={`${c.type}-${c.reference}`} className="rounded-[22px] border border-line bg-card px-[18px] py-4">
              <span className={cx('gs inline-block rounded-full px-[9px] py-1 text-[11px] font-bold text-on-a', TONE_BG[sourceTone(c.type)])}>{c.type}</span>
              <div className="gs mt-[10px] text-[16px] font-semibold text-ink">{c.reference}</div>
              {c.description ? <div className="gs mt-[2px] text-[13px] text-muted">{c.description}</div> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="gs mt-3 rounded-[22px] bg-inset px-[18px] py-4 text-[13px] leading-[1.5] text-muted lg:mt-auto">{DISCLAIMER}</p>
    </>
  );
}

/* ---------- page ---------- */

function Lumen() {
  const wide = useIsWide();
  const router = useRouter();
  const question = useSearchParams().get('q');
  const store = useAppStore();
  const conversations = useApp((s) => s.conversations);
  const activeId = useApp((s) => s.activeConversationId);
  const reading = useApp((s) => s.reading);
  const startConversation = useApp((s) => s.startConversation);
  const setActive = useApp((s) => s.setActiveConversation);
  const deleteConversation = useApp((s) => s.deleteConversation);
  const { ask, retry, streaming, error, remaining, clearError } = useLumenChat();
  const { guest } = useAccount();

  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<'history' | 'sources' | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const asked = useRef(false);

  const dictation = useDictation((heard) => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}${heard}`));

  const conversation = conversations.find((c) => c.id === activeId);
  const messages = conversation?.messages ?? [];
  const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastContent = messages[messages.length - 1]?.content.length ?? 0;
  const citations = lastAnswer?.citations ?? [];

  // Keep the newest words in view. Only the thread scrolls, never the page around it.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastContent, activeId, wide]);

  // A question handed over in the URL is asked once, in a conversation of its own.
  useEffect(() => {
    if (!question) return;
    // Deferred so that a development double-mount cannot start, and then abort, the request.
    const timer = window.setTimeout(() => {
      if (asked.current) return;
      asked.current = true;
      const state = store.getState();
      if (activeConversation(state)?.messages.length) state.startConversation();
      void ask(question);
      router.replace('/lumen');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [question, ask, router, store]);

  const send = (text: string) => {
    setDraft('');
    setSheet(null);
    void ask(text);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && !streaming) send(draft);
  };
  const fresh = () => {
    clearError();
    startConversation();
    setSheet(null);
  };
  const pick = (id: string) => {
    clearError();
    setActive(id);
    setSheet(null);
  };
  const remove = (id: string) => {
    clearError();
    deleteConversation(id);
  };
  const aboutReading = () => {
    const prefix = `About ${chapterLabel(reading)}: `;
    setDraft((d) => (d.startsWith(prefix) ? d : `${prefix}${d}`));
    input.current?.focus();
  };

  const sidebar = (
    <Sidebar
      conversations={conversations}
      activeId={activeId}
      busy={streaming}
      onNew={fresh}
      onPick={pick}
      onDelete={remove}
      onAsk={send}
    />
  );

  return (
    <Page fill>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-[250px_minmax(0,1fr)_310px] lg:grid-rows-[minmax(0,1fr)]">
        <Card as="aside" surface="inset" aria-label="Conversations" className="no-scrollbar hidden min-h-0 overflow-y-auto p-[18px] lg:block">
          {sidebar}
        </Card>

        <Card
          as="section"
          aria-label="Conversation"
          className="flex h-[calc(100dvh-196px)] min-h-[420px] min-w-0 flex-col overflow-hidden md:h-[calc(100dvh-212px)] lg:h-auto lg:min-h-0"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-[14px] md:px-[26px] md:py-[18px]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-a1 text-on-a">
              <Ico icon={Sparkles} size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="bq text-[22px] leading-none font-bold tracking-[-.03em] text-ink">Lumen</h1>
              <p className="gs mt-[3px] text-[13px] leading-[1.3] text-muted">Answers from Scripture &amp; the Catechism, with sources</p>
            </div>
            <div className="flex shrink-0 gap-2 lg:hidden">
              <Pill variant="inset" icon={HistoryIcon} iconSize={15} aria-label="History" onClick={() => setSheet('history')} className="px-3 py-[9px] text-[13px]">
                <span className="hidden sm:inline">History</span>
              </Pill>
              <Pill variant="inset" icon={BookOpenText} iconSize={15} aria-label="Sources" onClick={() => setSheet('sources')} className="px-3 py-[9px] text-[13px]">
                <span className="hidden sm:inline">Sources</span>
              </Pill>
            </div>
          </header>

          <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 md:px-10 md:py-[26px]">
            {messages.length === 0 ? (
              <Intro onAsk={send} />
            ) : (
              <>
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div
                      key={m.id}
                      className="gs max-w-[85%] self-end rounded-[22px_22px_6px_22px] bg-solid px-[18px] py-[14px] text-[16px] leading-[1.5] break-words text-white md:max-w-[70%]"
                    >
                      {m.content}
                    </div>
                  ) : (
                    <Answer key={m.id} message={m} live={streaming && i === messages.length - 1} />
                  ),
                )}
                {!streaming && lastAnswer && lastAnswer === messages[messages.length - 1] && lastAnswer.followUps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {lastAnswer.followUps.map((f) => (
                      <Outlined key={f} onClick={() => send(f)}>{f}</Outlined>
                    ))}
                  </div>
                ) : null}
              </>
            )}
            {error ? (
              <div role="alert">
                <p className="gs text-[14px] leading-[1.5] font-medium text-a1">{error.message}</p>
                <TextAction onClick={retry} className="mt-2 text-ink underline underline-offset-4">Try again</TextAction>
              </div>
            ) : null}
          </div>

          <div className="px-3 pt-3 pb-4 md:px-[22px] md:pt-4 md:pb-5">
            {guest ? (
              <p className="gs mb-3 rounded-[16px] bg-a3 px-4 py-[10px] text-[13px] leading-[1.45] font-medium text-on-a">
                Demo: Lumen gives a few short answers a day
                {remaining === null ? '' : remaining === 0 ? ', and that was the last for today' : `, ${remaining} left today`}.{' '}
                <Link href="/login?mode=signup" className="font-bold underline underline-offset-2">Create a free account</Link> for full answers with sources.
              </p>
            ) : null}
            <form onSubmit={submit} className="gs flex items-center gap-2 rounded-full bg-inset py-2 pr-2 pl-3 md:gap-3 md:pl-4">
              <button
                type="button"
                aria-label="Ask about what I’m reading"
                title="Ask about what I’m reading"
                onClick={aboutReading}
                className="hover-accent flex h-9 w-8 shrink-0 items-center justify-center text-muted"
              >
                <Ico icon={Paperclip} size={18} />
              </button>
              <input
                ref={input}
                aria-label="Ask Lumen"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about scripture, prayer, the saints…"
                maxLength={2000}
                className="min-w-0 flex-1 text-[15px] text-ink"
              />
              {dictation.supported ? (
                <button
                  type="button"
                  aria-label={dictation.listening ? 'Stop dictating' : 'Dictate'}
                  title={dictation.listening ? 'Stop dictating' : 'Dictate'}
                  aria-pressed={dictation.listening}
                  onClick={dictation.toggle}
                  className={cx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    dictation.listening ? 'hover-dim bg-a1 text-on-a' : 'hover-accent text-muted',
                  )}
                >
                  <Ico icon={Mic} size={18} />
                </button>
              ) : null}
              <button
                type="submit"
                aria-label="Send"
                disabled={!draft.trim() || streaming}
                className="hover-dim flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-a1 text-on-a disabled:opacity-40"
              >
                <Ico icon={ArrowUp} size={18} />
              </button>
            </form>
          </div>
        </Card>

        <aside aria-label="Sources" className="no-scrollbar hidden min-h-0 flex-col overflow-y-auto lg:flex">
          <h2 className="bq px-1 pt-[6px] pb-3 text-[22px] font-bold tracking-[-.03em] text-ink">Sources</h2>
          <Sources citations={citations} />
        </aside>
      </div>

      <Sheet open={sheet === 'history' && !wide} onClose={() => setSheet(null)} title="History">
        {sidebar}
      </Sheet>
      <Sheet open={sheet === 'sources' && !wide} onClose={() => setSheet(null)} title="Sources">
        <Sources citations={citations} />
      </Sheet>
    </Page>
  );
}

export default function LumenPage() {
  return (
    <Suspense fallback={null}>
      <Lumen />
    </Suspense>
  );
}
