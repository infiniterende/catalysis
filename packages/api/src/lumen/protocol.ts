/**
 * Lumen wire format, shared by the server route and both clients.
 *
 * The model writes plain prose so it can be streamed as it arrives:
 *   - paragraphs separated by a blank line
 *   - a quotation as `> ` lines, closed by a citation line `> — CCC 2838–2845`
 *   - then `META_MARKER` and one JSON object: `{ "sources": [...], "followUps": [...] }`
 *
 * The server forwards the prose as `delta` events, holds back the metadata, and
 * sends it parsed in the final `done` event. Events are newline-delimited JSON.
 */
import type { Citation, MessageBlock, SourceType } from '../types.ts';

export const META_MARKER = '<<<META>>>';

export interface LumenTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LumenRequest {
  mode: 'chat' | 'explain';
  messages: LumenTurn[];
  /** For `explain`: the passage being asked about. */
  passage?: { reference: string; text: string };
}

export type LumenEvent =
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      content: string;
      citations: Citation[];
      followUps: string[];
      /** A scripted answer, given when no model is configured. */
      demo: boolean;
      /** Set for a visitor trying the demo account: how many short answers they have left today. */
      remaining?: number;
    }
  | { type: 'error'; message: string };

const SOURCE_TYPES: SourceType[] = ['Scripture', 'Catechism', 'Council', 'Saint'];

/** Reads the metadata object defensively: the model's JSON is untrusted input. */
export function parseMeta(raw: string): { citations: Citation[]; followUps: string[] } {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return { citations: [], followUps: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { citations: [], followUps: [] };
  }
  if (!data || typeof data !== 'object') return { citations: [], followUps: [] };
  const { sources, followUps } = data as { sources?: unknown; followUps?: unknown };

  const citations: Citation[] = [];
  if (Array.isArray(sources)) {
    for (const s of sources) {
      if (!s || typeof s !== 'object') continue;
      const { type, reference, description } = s as Record<string, unknown>;
      if (typeof reference !== 'string' || !reference.trim()) continue;
      citations.push({
        type: SOURCE_TYPES.includes(type as SourceType) ? (type as SourceType) : 'Scripture',
        reference: reference.trim(),
        description: typeof description === 'string' ? description.trim() : '',
      });
    }
  }
  const chips = Array.isArray(followUps)
    ? followUps.filter((f): f is string => typeof f === 'string' && f.trim().length > 0).map((f) => f.trim()).slice(0, 3)
    : [];
  return { citations: citations.slice(0, 8), followUps: chips };
}

/** Splits a full model reply into prose and metadata. */
export function splitReply(full: string): { content: string; citations: Citation[]; followUps: string[] } {
  const at = full.indexOf(META_MARKER);
  if (at < 0) return { content: full.trim(), citations: [], followUps: [] };
  return { content: full.slice(0, at).trim(), ...parseMeta(full.slice(at + META_MARKER.length)) };
}

const CITATION_LINE = /^(?:—|–|--|-)\s*(.+)$/;

/** Turns Lumen prose into renderable blocks. Safe to call on partial text while streaming. */
export function parseLumenBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  for (const chunk of content.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every((l) => l.startsWith('>'))) {
      const text: string[] = [];
      let citation: string | undefined;
      for (const line of lines) {
        const body = line.replace(/^>\s?/, '').trim();
        const match = CITATION_LINE.exec(body);
        if (match?.[1]) citation = match[1].trim();
        else if (body) text.push(body);
      }
      if (text.length > 0) blocks.push({ kind: 'quote', text: text.join(' '), citation });
      continue;
    }
    blocks.push({ kind: 'paragraph', text: lines.join(' ') });
  }
  return blocks;
}

/** Plain text for the clipboard. */
export function lumenPlainText(content: string): string {
  return parseLumenBlocks(content)
    .map((b) => (b.kind === 'quote' ? `${b.text}${b.citation ? ` — ${b.citation}` : ''}` : b.text))
    .join('\n\n');
}

/**
 * Incremental filter used by the server: feed it model text, it returns only
 * the prose that is safe to forward, never leaking a partial `META_MARKER`.
 */
export function createProseFilter() {
  let buffer = '';
  let sent = 0;
  let closed = false;
  return {
    push(text: string): string {
      buffer += text;
      if (closed) return '';
      const at = buffer.indexOf(META_MARKER);
      let safeEnd: number;
      if (at >= 0) {
        closed = true;
        safeEnd = at;
      } else {
        // Hold back any tail that could be the start of the marker.
        safeEnd = buffer.length;
        for (let keep = Math.min(META_MARKER.length - 1, buffer.length); keep > 0; keep--) {
          if (META_MARKER.startsWith(buffer.slice(buffer.length - keep))) {
            safeEnd = buffer.length - keep;
            break;
          }
        }
      }
      const out = buffer.slice(sent, Math.max(sent, safeEnd));
      sent = Math.max(sent, safeEnd);
      return out;
    },
    /** Everything received so far, metadata included. */
    full: () => buffer,
  };
}

/** A short title for the history list, from the first question. */
export function conversationTitle(question: string): string {
  const clean = question.replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '');
  if (clean.length <= 42) return clean || 'New conversation';
  const cut = clean.slice(0, 42);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : 42)}…`;
}
