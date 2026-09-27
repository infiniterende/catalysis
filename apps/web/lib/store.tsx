'use client';

import {
  createAppStore, DEMO_USER, localAuth, setBibleSource,
  type AppState, type AppStore, type AuthErrors, type AuthProvider, type TikTokVideo,
} from '@catalysis/api';
import { loadNabreBook } from '@catalysis/bible-nabre';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { checkBackend, fetchState, Outbox, remoteAuth, type Backend } from './remote';

// The reader's text: each book is fetched as its own chunk the first time it is opened.
setBibleSource(loadNabreBook, 'nabre');

/** localStorage that never throws: private mode and full quotas degrade to memory. */
function safeStorage() {
  const memory = new Map<string, string>();
  return {
    getItem(key: string) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem(key: string, value: string) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        memory.set(key, value);
      }
    },
    removeItem(key: string) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        memory.delete(key);
      }
    },
  };
}

/**
 * The connection between the store and the server. There is one store per
 * page, so this is kept beside it rather than in React state.
 */
const link: { backend: Backend; outbox: Outbox | null; guest: boolean } = { backend: 'checking', outbox: null, guest: false };

/** True for a visitor trying the demo account: what they do stays in this browser. */
export const isGuest = () => link.guest;

/** What the demo may show of the real app: the TikTok videos approved for Reels. */
async function loadDemoExtras(store: AppStore): Promise<void> {
  try {
    const response = await fetch('/api/demo', { cache: 'no-store' });
    if (!response.ok) return;
    const data = (await response.json()) as { tiktok?: TikTokVideo[] };
    if (link.guest && Array.isArray(data.tiktok)) store.getState().setTikTok(data.tiktok);
  } catch {
    // The demo works without them.
  }
}

type Outcome = { ok: true } | { ok: false; errors: AuthErrors };

interface Account {
  /** `server`: real accounts in the database. `local`: data kept on this device. */
  backend: Backend;
  /** True for a visitor trying the demo account, where nothing is saved. */
  guest: boolean;
  /** Opens the demo account, with no sign-up. */
  startDemo(): void;
  signIn(input: { email: string; password: string }): Promise<Outcome>;
  signUp(input: { name: string; email: string; password: string }): Promise<Outcome>;
  signInWithProvider(provider: AuthProvider): Promise<Outcome>;
  requestPasswordReset(email: string): Promise<Outcome>;
  signOut(): Promise<void>;
}

const StoreContext = createContext<AppStore | null>(null);
const AccountContext = createContext<Account | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [backend, setBackend] = useState<Backend>('checking');
  const [guest, setGuest] = useState(false);
  const [store] = useState(() =>
    createAppStore(safeStorage(), 'catalysis', {
      onChange: (change) => {
        if (link.backend === 'server' && !link.guest) link.outbox?.push(change);
      },
    }),
  );

  useEffect(() => {
    let live = true;
    const box = new Outbox();
    box.onSignedOut = () => store.getState().signOut();
    link.outbox = box;

    void (async () => {
      await store.persist.rehydrate();
      const status = await checkBackend();
      if (!live) return;
      link.backend = status.backend;
      setBackend(status.backend);

      if (status.backend === 'server') {
        if (status.signedIn) {
          // What the device remembers is shown at once; the server's copy replaces it when it arrives.
          box.start();
          void fetchState().then((state) => {
            if (live && state) store.getState().loadRemote(state);
          });
        } else if (store.getState().user?.id === DEMO_USER.id) {
          // A visitor in the middle of the demo.
          link.guest = true;
          setGuest(true);
          void loadDemoExtras(store);
        } else if (store.getState().user && navigator.onLine) {
          // Left over from before accounts were real, or the session has ended.
          box.clear();
          store.getState().signOut();
        }
      }
      store.setState({ hydrated: true });
    })();

    return () => {
      live = false;
    };
  }, [store]);

  const leaveDemo = useCallback(() => {
    link.guest = false;
    setGuest(false);
  }, []);

  const signOut = useCallback(async () => {
    if (link.guest) {
      leaveDemo();
      store.getState().signOut();
      return;
    }
    if (link.backend === 'server') {
      link.outbox?.clear();
      await remoteAuth.signOut();
    }
    store.getState().signOut();
  }, [leaveDemo, store]);

  const account = useMemo<Account>(() => {
    const server = backend === 'server';
    const enter = async (request: ReturnType<typeof remoteAuth.signIn>): Promise<Outcome> => {
      const result = await request;
      if (!result.ok) return result;
      link.outbox?.clear();
      leaveDemo();
      store.getState().loadRemote(result.state);
      return { ok: true };
    };
    const enterLocal = async (request: ReturnType<typeof localAuth.signIn>): Promise<Outcome> => {
      const result = await request;
      if (!result.ok) return result;
      store.getState().startSession(result.user);
      return { ok: true };
    };
    return {
      backend,
      guest,
      startDemo() {
        if (server) {
          link.outbox?.clear();
          link.guest = true;
          setGuest(true);
        }
        store.getState().startSession(DEMO_USER);
        if (server) void loadDemoExtras(store);
      },
      signIn: (input) => (server ? enter(remoteAuth.signIn(input)) : enterLocal(localAuth.signIn(input))),
      signUp: (input) => (server ? enter(remoteAuth.signUp(input)) : enterLocal(localAuth.signUp(input))),
      async signInWithProvider(provider) {
        const result = await localAuth.signInWithProvider(provider);
        return result.ok ? { ok: true } : result;
      },
      async requestPasswordReset(email) {
        const checked = await localAuth.requestPasswordReset(email);
        if (!checked.ok) return checked;
        if (server) return { ok: false, errors: { form: 'Password reset by email isn’t set up yet. Please contact your chaplaincy.' } };
        return { ok: true };
      },
      signOut,
    };
  }, [backend, guest, leaveDemo, signOut, store]);

  return (
    <StoreContext.Provider value={store}>
      <AccountContext.Provider value={account}>{children}</AccountContext.Provider>
    </StoreContext.Provider>
  );
}

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useApp must be used inside <StoreProvider>');
  return store;
}

/** Subscribes to a slice of app state. Object and array results are compared shallowly. */
export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(useAppStore(), useShallow(selector));
}

/** Signing in and out, against the database when one is set up. */
export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount must be used inside <StoreProvider>');
  return account;
}
