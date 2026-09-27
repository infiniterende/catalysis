import { json } from '@/lib/server/auth';
import { withMember } from '@/lib/server/route';
import { readUpload } from '@/lib/server/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/uploads/:id → the photo, for signed-in members. */
export const GET = withMember(async ({ request }) => {
  const id = new URL(request.url).pathname.split('/').pop() ?? '';
  const upload = await readUpload(id);
  if (!upload) return json({ error: 'That photo could not be found.' }, { status: 404 });
  return new Response(new Uint8Array(upload.bytes), {
    headers: {
      'Content-Type': upload.contentType,
      'Content-Length': String(upload.bytes.byteLength),
      // A photo never changes once stored, and is only for members.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
});
