import { clearedCookie, endSession, json } from '@/lib/server/auth';
import { withPublic } from '@/lib/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout → ends the session. */
export const POST = withPublic(async (request) => {
  await endSession(request);
  return json({ ok: true }, { cookie: clearedCookie() });
});
