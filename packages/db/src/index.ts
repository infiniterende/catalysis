/**
 * Database access for the server. Import this only from server code (route
 * handlers, scripts): it needs DATABASE_URL and must never reach the browser.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

export * from '../generated/prisma/client.ts';

/** True when a usable connection string is present. */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url) && !url?.includes('[YOUR-PASSWORD]');
}

const globalForDb = globalThis as unknown as { catalysisDb?: PrismaClient };

/**
 * The shared client. It connects through Supabase's transaction-mode pooler
 * (DATABASE_URL). One instance is kept per process, including across hot reloads.
 */
export function db(): PrismaClient {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is not set.');
  if (!globalForDb.catalysisDb) {
    // `pgbouncer=true` is a hint for Prisma's old engine; node-postgres does not know it.
    const url = new URL(process.env.DATABASE_URL as string);
    url.searchParams.delete('pgbouncer');
    globalForDb.catalysisDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), max: 5 }) });
  }
  return globalForDb.catalysisDb;
}
