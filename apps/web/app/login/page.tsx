'use client';

import { PASSWORD_MIN, type AuthErrors, type AuthProvider } from '@catalysis/api';
import { ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Logo, ThemeToggle } from '@/components/shell';
import { Card, Field, FieldError, Pill, Segmented, TextAction } from '@/components/ui';
import { ASSETS } from '@/lib/media';
import { useAccount, useApp } from '@/lib/store';

type Mode = 'login' | 'signup';

const COPY: Record<Mode, { title: string; accent: string; deck: string; submit: string }> = {
  login: { title: 'Welcome', accent: 'back.', deck: 'Pick up where you left off. Today’s readings are waiting.', submit: 'Log in' },
  signup: { title: 'Join', accent: 'us.', deck: 'Create your account. It takes a minute.', submit: 'Create account' },
};

/** Only same-site paths are followed after sign-in. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/today';
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const mode: Mode = params.get('mode') === 'signup' ? 'signup' : 'login';

  const hydrated = useApp((s) => s.hydrated);
  const signedIn = useApp((s) => s.user !== null);
  const account = useAccount();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A visitor in the demo has come here to make a real account.
    if (hydrated && signedIn && !account.guest) router.replace(next);
  }, [hydrated, signedIn, account.guest, router, next]);

  const setMode = (to: Mode) => {
    setErrors({});
    setNotice('');
    const query = new URLSearchParams(params.toString());
    if (to === 'signup') query.set('mode', 'signup');
    else query.delete('mode');
    const qs = query.toString();
    router.replace(qs ? `/login?${qs}` : '/login');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    const result = mode === 'signup'
      ? await account.signUp({ name, email, password })
      : await account.signIn({ email, password });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    router.replace(next);
  };

  const provider = async (which: AuthProvider) => {
    setNotice('');
    const result = await account.signInWithProvider(which);
    if (!result.ok) setErrors(result.errors);
  };

  const forgot = async () => {
    const result = await account.requestPasswordReset(email);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`);
  };

  const copy = COPY[mode];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-4 md:px-8 md:py-[22px]">
        <Logo href="/" size="landing" />
        <ThemeToggle />
      </header>
      <main className="mx-auto grid max-w-[1320px] gap-4 px-4 pb-10 md:px-8 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6 md:p-10">
          <form onSubmit={submit} noValidate className="mx-auto max-w-[440px]">
            <div className="mn text-a1">Members</div>
            <h1 className="bq mt-3 text-[48px] leading-none font-bold tracking-[-.035em] text-ink md:text-[64px]">
              {copy.title} <span className="tracking-[-.01em] text-muted">{copy.accent}</span>
            </h1>
            <p className="gs mt-3 text-[16px] leading-[1.5] text-muted">{copy.deck}</p>

            <Segmented
              label="Log in or sign up"
              className="mt-7"
              stretch
              value={mode}
              onChange={setMode}
              items={[{ id: 'login', label: 'Log in' }, { id: 'signup', label: 'Sign up' }]}
            />

            {mode === 'signup' ? (
              <Field id="name" label="Name" className="mt-6" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            ) : null}
            <Field
              id="email" label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              className={mode === 'signup' ? 'mt-5' : 'mt-6'}
              value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
            />
            <Field
              id="password" label="Password" type={show ? 'text' : 'password'} className="mt-5"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password}
              trailing={<TextAction onClick={() => setShow((v) => !v)} aria-pressed={show} className="text-muted">{show ? 'Hide' : 'Show'}</TextAction>}
            />

            {mode === 'login' ? (
              <div className="mt-3 text-right">
                <TextAction onClick={forgot} className="text-ink">Forgot password?</TextAction>
              </div>
            ) : (
              <p className="gs mt-3 text-[13px] text-muted">At least {PASSWORD_MIN} characters.</p>
            )}

            <FieldError>{errors.form}</FieldError>
            {notice ? <p role="status" className="gs mt-3 text-[14px] text-muted">{notice}</p> : null}

            <Pill type="submit" disabled={busy || account.backend === 'checking'} iconAfter={ArrowRight} className="mt-6 w-full py-[17px] text-[16px]">{copy.submit}</Pill>

            <div className="my-6 flex items-center gap-[14px]">
              <div className="h-px flex-1 bg-line" />
              <span className="gs text-[13px] text-subtle">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="flex gap-[10px]">
              <Pill variant="ghost" onClick={() => provider('google')} className="flex-1 py-[14px] text-[15px]">Google</Pill>
              <Pill variant="ghost" onClick={() => provider('apple')} className="flex-1 py-[14px] text-[15px]">Apple</Pill>
            </div>

            <p className="gs mt-6 text-center text-[15px] text-muted">
              {mode === 'login' ? 'New here? ' : 'Already a member? '}
              <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="hover-dim font-semibold text-a1">
                {mode === 'login' ? 'Create an account' : 'Log in'}
              </button>
            </p>
            <div className="mt-5 rounded-[16px] bg-inset px-4 py-4 text-center">
              <p className="gs text-[13px] leading-[1.5] text-muted">Just looking? Try the app with a sample account. Nothing is saved.</p>
              <Pill href="/demo" variant="ghost" className="mt-3 px-5 py-[10px] text-[14px]">Try the demo</Pill>
            </div>
          </form>
        </Card>

        <aside
          aria-hidden
          className="relative hidden min-h-[640px] overflow-hidden rounded-[28px] lg:block"
          style={{ background: `#121212 url('${ASSETS.angel}') 50% 30% / cover no-repeat` }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.85))' }} />
          <div className="absolute right-9 bottom-9 left-9">
            <span className="mn rounded-full bg-a2 px-3 py-[6px] text-on-a">Verse of the day</span>
            <p className="bq mt-4 text-[44px] leading-[1.05] text-white">The light shines in the darkness, and the darkness has not overcome it.</p>
            <p className="gs mt-3 text-[14px] font-semibold text-on-photo">John 1:5</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
