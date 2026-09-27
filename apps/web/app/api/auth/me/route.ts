import { isDatabaseConfigured } from '@catalysis/db';
import { json, sessionUserId } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me → `{ configured, signedIn }`.
 * `configured: false` tells the app to keep its data on the device, as it does
 * when no database is set up.
 */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return json({ configured: false, signedIn: false });
  try {
    return json({ configured: true, signedIn: Boolean(await sessionUserId(request)) });
  } catch (error) {
    console.error('[api] GET /api/auth/me', error);
    return json({ configured: true, signedIn: false, error: 'The database could not be reached.' }, { status: 503 });
  }
}
