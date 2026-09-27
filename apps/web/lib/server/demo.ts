/**
 * The demo account lets a visitor try the app without signing up. Everything
 * they do stays in their own browser; nothing is written to the database.
 *
 * Lumen is the one thing that costs money, so a visitor gets only a taste of
 * it: a few answers a day, each cut short. The count is kept in the database,
 * so it holds across servers and restarts.
 */
import { createHash } from 'node:crypto';
import { db } from '@catalysis/db';
import { clientKey } from './auth';

const number = (value: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
};

export const DEMO_HEADER = 'x-catalysis-demo';
/** The most tokens Lumen may spend on one answer to a demo visitor. */
export const demoTokens = () => number(process.env.DEMO_LUMEN_TOKENS, 100, 20, 1000);
/** Answers one visitor may have in a day. */
export const demoQuestions = () => number(process.env.DEMO_LUMEN_QUESTIONS, 5, 0, 100);
/** Answers all demo visitors together may have in a day, to bound what the demo can cost. */
export const demoQuestionsForAll = () => number(process.env.DEMO_LUMEN_DAILY_TOTAL, 300, 0, 100000);

export const DEMO_MAX_INPUT = 400;

export const isDemoRequest = (request: Request) => request.headers.get(DEMO_HEADER) === '1';

const DAY = 86_400_000;

/** Adds one to a counter and returns the new count. The counter starts again after a day. */
async function count(key: string): Promise<number> {
  const resetAt = new Date(Date.now() + DAY);
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO "Allowance" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "Allowance"."resetAt" < now() THEN 1 ELSE "Allowance"."count" + 1 END,
      "resetAt" = CASE WHEN "Allowance"."resetAt" < now() THEN ${resetAt} ELSE "Allowance"."resetAt" END
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 1);
}

export type DemoAllowance = { ok: true; remaining: number } | { ok: false; message: string };

/** Takes one answer from the visitor's allowance for today. */
export async function takeDemoAnswer(request: Request): Promise<DemoAllowance> {
  const mine = demoQuestions();
  const SIGN_UP = 'Create a free account to keep asking Lumen.';
  if (mine === 0) return { ok: false, message: `Lumen is not part of the demo. ${SIGN_UP}` };
  // Only a hash of the address is kept, salted with a secret, so the table cannot be read back into addresses.
  const who = createHash('sha256').update(`${clientKey(request)}|${process.env.DATABASE_URL ?? ''}`).digest('hex').slice(0, 32);
  const used = await count(`demo-lumen:${who}`);
  if (used > mine) return { ok: false, message: `That’s all of today’s demo answers. ${SIGN_UP}` };
  if ((await count('demo-lumen:everyone')) > demoQuestionsForAll()) {
    return { ok: false, message: `The demo has given all of today’s answers. ${SIGN_UP}` };
  }
  return { ok: true, remaining: mine - used };
}
