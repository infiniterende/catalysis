/**
 * Authentication seam. The apps talk to an `AuthAdapter`; today that is
 * `localAuth`, a development adapter that keeps the session on the device and
 * never stores or transmits the password. Replace it with a Supabase (or
 * equivalent) adapter to get real accounts and Google / Apple sign-in.
 */
import { DEMO_EMAIL, DEMO_USER, newUser } from './seed.ts';
import type { User } from './types.ts';
import { validateEmail, validateName, validatePassword } from './validation.ts';

export type AuthField = 'name' | 'email' | 'password' | 'form';
export type AuthErrors = Partial<Record<AuthField, string>>;
export type AuthProvider = 'google' | 'apple';

export type AuthResult = { ok: true; user: User } | { ok: false; errors: AuthErrors };

export interface AuthAdapter {
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  signUp(input: { name: string; email: string; password: string }): Promise<AuthResult>;
  signInWithProvider(provider: AuthProvider): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<{ ok: true } | { ok: false; errors: AuthErrors }>;
}

function collect(entries: [AuthField, string | null][]): AuthErrors | null {
  const errors: AuthErrors = {};
  for (const [field, message] of entries) if (message) errors[field] = message;
  return Object.keys(errors).length > 0 ? errors : null;
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'Friend';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Friend';
}

export const localAuth: AuthAdapter = {
  async signIn({ email, password }) {
    const errors = collect([['email', validateEmail(email)], ['password', validatePassword(password)]]);
    if (errors) return { ok: false, errors };
    const normalized = email.trim().toLowerCase();
    if (normalized === DEMO_EMAIL) return { ok: true, user: DEMO_USER };
    return { ok: true, user: newUser({ name: nameFromEmail(normalized), email: normalized }) };
  },

  async signUp({ name, email, password }) {
    const errors = collect([
      ['name', validateName(name)],
      ['email', validateEmail(email)],
      ['password', validatePassword(password)],
    ]);
    if (errors) return { ok: false, errors };
    return { ok: true, user: newUser({ name, email }) };
  },

  async signInWithProvider(provider) {
    const label = provider === 'google' ? 'Google' : 'Apple';
    return { ok: false, errors: { form: `${label} sign-in isn’t set up yet. Use your email for now.` } };
  },

  async requestPasswordReset(email) {
    const message = validateEmail(email);
    if (message) return { ok: false, errors: { email: message } };
    return { ok: true };
  },
};
