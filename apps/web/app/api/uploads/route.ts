import { allowAttempt, json } from '@/lib/server/auth';
import { withMember } from '@/lib/server/route';
import { MAX_UPLOAD_BYTES, storeUpload } from '@/lib/server/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/uploads, the photo as the body → `{ url }`. JPEG, PNG or WebP, up to 1.5 MB. */
export const POST = withMember(async ({ request, userId }) => {
  if (!allowAttempt(`upload:${userId}`, 40)) return json({ error: 'That’s a lot of photos at once. Try again in a few minutes.' }, { status: 429 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES) {
    return json({ error: 'That photo is too large. Try a smaller one.' }, { status: 413 });
  }
  const stored = await storeUpload(userId, new Uint8Array(await request.arrayBuffer()));
  if (!stored.ok) return json({ error: stored.error }, { status: stored.status });
  return json({ url: stored.url }, { status: 201 });
});
