import { signUp } from '@/lib/server/accounts';
import { allowAttempt, clientKey, createSession, json, sessionCookie, tokenFor } from '@/lib/server/auth';
import { readJson, withPublic } from '@/lib/server/route';
import { loadState } from '@/lib/server/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/signup { name, email, password } → the new member's state, and a session cookie. */
export const POST = withPublic(async (request) => {
  if (!allowAttempt(`signup:${clientKey(request)}`, 6)) {
    return json({ errors: { form: 'Too many attempts. Please wait a few minutes and try again.' } }, { status: 429 });
  }
  const body = await readJson(request);
  if (!body) return json({ errors: { form: 'The request was not understood.' } }, { status: 400 });

  const result = await signUp({ name: body.name, email: body.email, password: body.password });
  if (!result.ok) return json({ errors: result.errors }, { status: result.status });

  const session = await createSession(result.userId);
  return json({ state: await loadState(result.userId), ...tokenFor(request, session.token) }, { status: 201, cookie: sessionCookie(session.token, session.expiresAt) });
});
