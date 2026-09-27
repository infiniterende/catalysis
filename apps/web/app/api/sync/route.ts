import { json } from '@/lib/server/auth';
import { applyChange, changes, Refused } from '@/lib/server/changes';
import { readJson, withMember } from '@/lib/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sync { changes: Change[] } → `{ applied, refused }`.
 * Changes are written in order. One that is refused does not stop the rest.
 */
export const POST = withMember(async ({ request, userId }) => {
  const body = await readJson(request);
  const parsed = changes.safeParse(body?.changes);
  if (!parsed.success) {
    return json({ error: 'Those changes were not understood.', issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
  }

  let applied = 0;
  const refused: { index: number; message: string }[] = [];
  for (const [index, change] of parsed.data.entries()) {
    try {
      await applyChange(userId, change);
      applied += 1;
    } catch (error) {
      if (!(error instanceof Refused)) throw error;
      refused.push({ index, message: error.message });
    }
  }
  return json({ applied, refused });
});
