/**
 * Photos members add: portraits and the pictures on posts. They are kept in the
 * database and served to signed-in members, so a photo added on one device is
 * seen on every other. Videos are too large for this and stay on the device.
 */
import { db } from '@catalysis/db';

export const MAX_UPLOAD_BYTES = 1_500_000;
export const MAX_UPLOADS_PER_MEMBER = 400;
export const UPLOAD_PATH = /^\/api\/uploads\/[a-z0-9]{20,40}$/;

const TYPES: { type: string; matches: (b: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    type: 'image/webp',
    matches: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/** What the bytes are, going by how they begin rather than by what the sender says. */
export function imageType(bytes: Uint8Array): string | undefined {
  return TYPES.find((t) => t.matches(bytes))?.type;
}

export type Stored = { ok: true; url: string } | { ok: false; status: number; error: string };

export async function storeUpload(userId: string, bytes: Uint8Array): Promise<Stored> {
  if (bytes.byteLength === 0) return { ok: false, status: 400, error: 'That photo was empty.' };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, status: 413, error: 'That photo is too large. Try a smaller one.' };
  const contentType = imageType(bytes);
  if (!contentType) return { ok: false, status: 415, error: 'Photos must be JPEG, PNG or WebP.' };
  if ((await db().upload.count({ where: { userId } })) >= MAX_UPLOADS_PER_MEMBER) {
    return { ok: false, status: 409, error: 'You have reached the limit for photos.' };
  }
  const row = await db().upload.create({
    data: { userId, contentType, size: bytes.byteLength, bytes: new Uint8Array(bytes) },
    select: { id: true },
  });
  return { ok: true, url: `/api/uploads/${row.id}` };
}

export async function readUpload(id: string): Promise<{ contentType: string; bytes: Uint8Array } | null> {
  if (!/^[a-z0-9]{20,40}$/.test(id)) return null;
  const row = await db().upload.findUnique({ where: { id }, select: { contentType: true, bytes: true } });
  return row ? { contentType: row.contentType, bytes: row.bytes } : null;
}
