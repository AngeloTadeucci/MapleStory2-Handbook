import type { RequestHandler } from '@sveltejs/kit';
import { RateLimiterRes, type RateLimiterMemory } from 'rate-limiter-flexible';

// Largest value the Int id columns can hold. Anything above would make Prisma throw.
const MAX_ID = 2_147_483_647;

type VisitHandlerOptions = {
  /** Singular name used in response messages, for example 'item'. */
  noun: string;
  rateLimiter: RateLimiterMemory;
  /** Runs `updateMany` on the entity's table and returns how many rows matched. */
  increment: (id: number) => Promise<{ count: number }>;
  /** Send empty bodies instead of JSON messages when running in production. */
  quietInProduction?: boolean;
};

function parseId(raw: string | null): number | null {
  if (raw == null || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_ID ? id : null;
}

/** Builds the POST handler that counts one page view per IP and entity. */
export function createVisitHandler({
  noun,
  rateLimiter,
  increment,
  quietInProduction = false
}: VisitHandlerOptions): RequestHandler {
  const reply = (status: number, message: string) => {
    const hideBody = quietInProduction && import.meta.env.PUBLIC_NODE_ENV === 'prod';
    return new Response(hideBody ? '' : JSON.stringify({ message }), { status });
  };

  return async (event) => {
    const rawId = event.url.searchParams.get('id');
    if (rawId == null) return reply(400, `No ${noun} id provided`);

    const id = parseId(rawId);
    if (id == null) return reply(400, `Invalid ${noun} id`);

    try {
      // Keyed on the parsed id so zero-padded ids cannot dodge the limit.
      await rateLimiter.consume(`${id}-${event.getClientAddress()}`);
    } catch (err) {
      if (err instanceof RateLimiterRes) return reply(429, 'Too many requests');
      console.error(`Visit count rate limiter failed for ${noun} ${id}`, err);
      return reply(500, 'Internal error');
    }

    try {
      const { count } = await increment(id);
      if (count === 0) return reply(404, `${noun[0].toUpperCase()}${noun.slice(1)} not found`);
    } catch (err) {
      console.error(`Visit count update failed for ${noun} ${id}`, err);
      return reply(500, 'Internal error');
    }

    return new Response();
  };
}
