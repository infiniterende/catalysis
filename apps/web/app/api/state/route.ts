import { json } from '@/lib/server/auth';
import { withMember } from '@/lib/server/route';
import { loadState } from '@/lib/server/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/state → everything the app shows the signed-in member. */
export const GET = withMember(async ({ userId }) => {
  const state = await loadState(userId);
  if (!state) return json({ error: 'Please log in.' }, { status: 401 });
  return json({ state });
});
