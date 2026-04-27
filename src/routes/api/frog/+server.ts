import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';

// CREATE TABLE IF NOT EXISTS site_stats (
//   id INT NOT NULL DEFAULT 1 PRIMARY KEY,
//   frog_appreciation_count INT NOT NULL DEFAULT 0
// );

// -- Insert initial row
// INSERT IGNORE INTO site_stats (id, frog_appreciation_count) VALUES (1, 0);
const prisma = DBClient.getInstance().prisma;
// GET: Fetch the current global frog appreciation count
export const GET = (async () => {
  try {
    const stats = await prisma.$queryRaw<{ frog_appreciation_count: bigint }[]>`
      SELECT frog_appreciation_count
      FROM site_stats
      WHERE id = 1
      LIMIT 1
    `;

    return json({ count: Number(stats[0]?.frog_appreciation_count ?? 0) });
  } catch {
    return json({ count: 0 });
  }
}) satisfies RequestHandler;

// POST: Increment the global frog appreciation count by a batch amount
export const POST = (async (req) => {
  try {
    const body = await req.request.json();
    // Cap at 500 per request - high enough for any real clicking, prevents sending billions
    const amount = Math.min(Math.max(Math.floor(body.amount ?? 1), 1), 500);

    // Upsert: create if not exists, increment if exists
    await prisma.$executeRaw`
      INSERT INTO site_stats (id, frog_appreciation_count)
      VALUES (1, ${amount})
      ON DUPLICATE KEY UPDATE frog_appreciation_count = frog_appreciation_count + ${amount}
    `;

    const result = await prisma.$queryRaw<{ frog_appreciation_count: bigint }[]>`
      SELECT frog_appreciation_count
      FROM site_stats
      WHERE id = 1
      LIMIT 1
    `;

    return json({ count: Number(result[0]?.frog_appreciation_count ?? 0) });
  } catch {
    // On error, try to return current count
    try {
      const stats = await prisma.$queryRaw<{ frog_appreciation_count: bigint }[]>`
        SELECT frog_appreciation_count
        FROM site_stats
        WHERE id = 1
        LIMIT 1
      `;
      return json({ count: Number(stats[0]?.frog_appreciation_count ?? 0), error: true });
    } catch {
      return json({ count: 0, error: true });
    }
  }
}) satisfies RequestHandler;
