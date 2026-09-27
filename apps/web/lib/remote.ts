'use client';

/**
 * The browser's side of the API. When a database is set up the app runs in
 * `server` mode: accounts are real and every change is sent to `/api/sync`.
 * Without one it runs in `local` mode and keeps its data on the device.
 */
import { compactChanges, type AppData, type AuthErrors, type Change, type User } from '@catalysis/api';

export type Backend = 'checking' | 'local' | 'server';
export type RemoteState = Partial<AppData> & { user: User };
export type SessionResult = { ok: true; state: RemoteState } | { ok: false; errors: AuthErrors };

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const OUTBOX = 'catalysis-outbox';
const BATCH = 50;

async function call(path: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // An empty or non-JSON body is treated as no body.
  }
  return { status: response.status, body };
}

export async function checkBackend(): Promise<{ backend: Exclude<Backend, 'checking'>; signedIn: boolean }> {
  try {
    const { body } = await call('/api/auth/me');
    if (body.configured === false) return { backend: 'local', signedIn: false };
    return { backend: 'server', signedIn: body.signedIn === true };
  } catch {
    // Offline: carry on with what the device has, and send changes when the network returns.
    return { backend: 'server', signedIn: false };
  }
}

export async function fetchState(): Promise<RemoteState | null> {
  const { status, body } = await call('/api/state');
  return status === 200 && body.state ? (body.state as RemoteState) : null;
}

const UNREACHABLE: SessionResult = { ok: false, errors: { form: 'We couldn’t reach Catalysis. Check your connection and try again.' } };

async function session(path: string, payload: object): Promise<SessionResult> {
  try {
    const { status, body } = await call(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
    if ((status === 200 || status === 201) && body.state) return { ok: true, state: body.state as RemoteState };
    const errors = body.errors as AuthErrors | undefined;
    return { ok: false, errors: errors ?? { form: typeof body.error === 'string' ? body.error : 'That didn’t work. Please try again.' } };
  } catch {
    return UNREACHABLE;
  }
}

export const remoteAuth = {
  signIn: (input: { email: string; password: string }) => session('/api/auth/login', input),
  signUp: (input: { name: string; email: string; password: string }) => session('/api/auth/signup', input),
  async signOut(): Promise<void> {
    try {
      await call('/api/auth/logout', { method: 'POST', headers: JSON_HEADERS, body: '{}' });
    } catch {
      // The device is signed out either way; the session expires on its own.
    }
  },
};

/**
 * Sends changes to the server in order, a batch at a time. Changes wait in
 * localStorage until they are accepted, so closing the tab or losing the
 * network does not lose them.
 */
export class Outbox {
  private queue: Change[] = [];
  private timer: number | undefined;
  private sending = false;
  private retryIn = 1000;
  onSignedOut: () => void = () => undefined;

  constructor() {
    try {
      const saved = window.localStorage.getItem(OUTBOX);
      if (saved) this.queue = JSON.parse(saved) as Change[];
    } catch {
      this.queue = [];
    }
  }

  push(change: Change) {
    this.queue.push(change);
    this.save();
    this.schedule(400);
  }

  /** Sends anything waiting, e.g. left over from an earlier visit. */
  start() {
    if (this.queue.length > 0) this.schedule(0);
  }

  clear() {
    this.queue = [];
    this.save();
    window.clearTimeout(this.timer);
  }

  private save() {
    try {
      if (this.queue.length === 0) window.localStorage.removeItem(OUTBOX);
      else window.localStorage.setItem(OUTBOX, JSON.stringify(this.queue.slice(-500)));
    } catch {
      // Without storage the queue lives for this visit only.
    }
  }

  private schedule(delay: number) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), delay);
  }

  private async flush() {
    if (this.sending || this.queue.length === 0) return;
    this.sending = true;
    const taken = this.queue.length;
    const batch = compactChanges(this.queue).slice(0, BATCH);
    try {
      const { status } = await call('/api/sync', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ changes: batch }) });
      if (status === 401) {
        this.clear();
        this.onSignedOut();
        return;
      }
      if (status >= 500) throw new Error('server');
      // Accepted, or refused as malformed: either way these changes are finished with.
      const sent = compactChanges(this.queue.slice(0, taken)).length <= BATCH ? taken : this.countCovered(batch.length);
      this.queue = this.queue.slice(sent);
      this.save();
      this.retryIn = 1000;
      if (this.queue.length > 0) this.schedule(0);
    } catch {
      this.retryIn = Math.min(this.retryIn * 2, 60_000);
      this.schedule(this.retryIn);
    } finally {
      this.sending = false;
    }
  }

  /** How many queued changes the first `n` compacted changes stand for. */
  private countCovered(n: number): number {
    for (let taken = 1; taken <= this.queue.length; taken++) {
      if (compactChanges(this.queue.slice(0, taken)).length > n) return taken - 1;
    }
    return this.queue.length;
  }
}
