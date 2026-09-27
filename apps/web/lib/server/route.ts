/** Shared plumbing for the API routes. */
import { isDatabaseConfigured } from '@catalysis/db';
import { json, sameOrigin, sessionUserId } from './auth';

export const NOT_CONFIGURED = () => json({ error: 'The database is not set up.', configured: false }, { status: 503 });

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type Handler = (context: { request: Request; userId: string }) => Promise<Response>;

/** Wraps a route that needs a signed-in member. */
export function withMember(handler: Handler) {
  return async (request: Request): Promise<Response> => {
    if (!isDatabaseConfigured()) return NOT_CONFIGURED();
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'That request came from another site.' }, { status: 403 });
    try {
      const userId = await sessionUserId(request);
      if (!userId) return json({ error: 'Please log in.' }, { status: 401 });
      return await handler({ request, userId });
    } catch (error) {
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
    }
  };
}

/** Wraps a route anyone may call. */
export function withPublic(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (!isDatabaseConfigured()) return NOT_CONFIGURED();
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'That request came from another site.' }, { status: 403 });
    try {
      return await handler(request);
    } catch (error) {
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
    }
  };
}
