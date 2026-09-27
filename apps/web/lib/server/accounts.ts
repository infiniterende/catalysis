/** Creating and looking up accounts. */
import { DEFAULT_PRAYERS, newUser, validateEmail, validateName, validatePassword, type AuthErrors } from '@catalysis/api';
import { db } from '@catalysis/db';
import { hashPassword, verifyPassword } from './auth';

export type AccountResult = { ok: true; userId: string } | { ok: false; status: number; errors: AuthErrors };

const collect = (entries: [keyof AuthErrors, string | null][]): AuthErrors | null => {
  const errors: AuthErrors = {};
  for (const [field, message] of entries) if (message) errors[field] = message;
  return Object.keys(errors).length > 0 ? errors : null;
};

async function freeHandle(base: string): Promise<string> {
  const client = db();
  for (let attempt = 0; attempt < 6; attempt++) {
    const handle = attempt === 0 ? base : `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
    if (!(await client.user.findUnique({ where: { handle }, select: { id: true } }))) return handle;
  }
  return `${base}${Date.now().toString(36)}`;
}

export async function signUp(input: { name: unknown; email: unknown; password: unknown }): Promise<AccountResult> {
  const name = typeof input.name === 'string' ? input.name : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const errors = collect([['name', validateName(name)], ['email', validateEmail(email)], ['password', validatePassword(password)]]);
  if (errors) return { ok: false, status: 400, errors };
  if (name.length > 80 || email.length > 200 || password.length > 200) {
    return { ok: false, status: 400, errors: { form: 'One of those is too long.' } };
  }

  const client = db();
  if (await client.user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, status: 409, errors: { email: 'An account with this email already exists. Log in instead.' } };
  }

  const draft = newUser({ name, email });
  const user = await client.user.create({
    data: {
      email,
      name: draft.name,
      handle: await freeHandle(draft.handle),
      parish: '',
      passwordHash: await hashPassword(password),
      milestones: { create: draft.milestones.map((m, position) => ({ title: m.title, current: m.progress?.current, total: m.progress?.total, position })) },
    },
    select: { id: true },
  });
  // Every member starts with the same rule of life and can change it.
  await client.prayer.createMany({
    data: DEFAULT_PRAYERS.map((p, position) => ({
      id: `${user.id}:${p.id}`,
      userId: user.id,
      title: p.title,
      shortTitle: p.shortTitle,
      scheduledTime: p.scheduledTime,
      guidedContentId: p.guidedContentId,
      position,
    })),
  });
  return { ok: true, userId: user.id };
}

export async function logIn(input: { email: unknown; password: unknown }): Promise<AccountResult> {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const errors = collect([['email', validateEmail(email)], ['password', password ? null : 'Enter your password.']]);
  if (errors) return { ok: false, status: 400, errors };

  const user = await db().user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const matches = await verifyPassword(password.slice(0, 200), user?.passwordHash ?? null);
  // One message for both cases, so the form does not reveal which emails have accounts.
  if (!user || !matches) return { ok: false, status: 401, errors: { form: 'That email and password don’t match. Try again.' } };
  return { ok: true, userId: user.id };
}
