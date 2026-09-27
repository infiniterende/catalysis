import { logIn } from '@/lib/server/accounts';
import { allowAttempt, clientKey, createSession, json, sessionCookie, tokenFor } from '@/lib/server/auth';
import { readJson, withPublic } from '@/lib/server/route';
import { loadState } from '@/lib/server/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/login { email, password } → the member's state, and a session cookie. */
export const POST = withPublic(async (request) => {
  const body = await readJson(request);
  if (!body) return json({ errors: { form: 'The request was not understood.' } }, { status: 400 });

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  // Limited by address and by account, so neither one caller nor one target can be hammered.
  if (!allowAttempt(`login:${clientKey(request)}`, 20) || !allowAttempt(`login:${email}`, 8)) {
    return json({ errors: { form: 'Too many attempts. Please wait a few minutes and try again.' } }, { status: 429 });
  }

  const result = await logIn({ email: body.email, password: body.password });
  if (!result.ok) return json({ errors: result.errors }, { status: result.status });

  const session = await createSession(result.userId);
  return json({ state: await loadState(result.userId), ...tokenFor(request, session.token) }, { cookie: sessionCookie(session.token, session.expiresAt) });
});
