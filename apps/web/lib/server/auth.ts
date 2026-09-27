/**
 * Accounts and sessions.
 *
 * Passwords are hashed with scrypt and never stored or logged. A session is a
 * random token held in an httpOnly cookie; the database keeps only its SHA-256,
 * so a leaked table cannot be used to sign in. Native clients may send the same
 * token as `Authorization: Bearer`.
 */
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db, isDatabaseConfigured } from '@catalysis/db';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;

export const SESSION_COOKIE = 'catalysis_session';
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = (stored ?? '').split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) {
    // Spend the same effort on an unknown account, so timing does not reveal which emails exist.
    await scrypt(password, Buffer.alloc(16), KEY_LENGTH, SCRYPT);
    return false;
  }
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  return { token, expiresAt };
}

function tokenFrom(request: Request): string | undefined {
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (bearer) return bearer.trim();
  const cookies = request.headers.get('cookie') ?? '';
  for (const part of cookies.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

/** The signed-in member's id, or `null`. */
export async function sessionUserId(request: Request): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const token = tokenFrom(request);
  if (!token) return null;
  const session = await db().session.findUnique({ where: { tokenHash: digest(token) }, select: { userId: true, expiresAt: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.userId;
}

export async function endSession(request: Request): Promise<void> {
  const token = tokenFrom(request);
  if (token) await db().session.deleteMany({ where: { tokenHash: digest(token) } });
}

export function sessionCookie(token: string, expiresAt: Date): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

/**
 * Browsers keep the session in the httpOnly cookie and are never handed the
 * token. A native app cannot use cookies the same way, so it asks for the token
 * by naming itself and sends it back as a bearer token.
 */
export function tokenFor(request: Request, token: string): { token?: string } {
  return request.headers.get('x-catalysis-client') === 'native' ? { token } : {};
}

export function clearedCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/**
 * Requests that change something must come from this site. With SameSite=Lax
 * cookies this is a second line of defence against cross-site requests.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Native clients and same-origin GETs send none.
  try {
    return new URL(origin).host === (request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  } catch {
    return false;
  }
}

/* ---------- attempt limiting ---------- */

const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Allows `limit` attempts per `windowMs` for a key. Kept in memory, so it is
 * per server instance: enough to slow guessing, not a substitute for limits at
 * the edge.
 */
export function allowAttempt(key: string, limit = 8, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clientKey(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'local';
}

export const json = (body: unknown, init?: ResponseInit & { cookie?: string }) => {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  if (init?.cookie) headers.append('Set-Cookie', init.cookie);
  return Response.json(body, { ...init, headers });
};
