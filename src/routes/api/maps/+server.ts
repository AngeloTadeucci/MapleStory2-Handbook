import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchMap } from '$lib/types/Map';
import { parsePagination } from '$lib/server/pagination';
import { createVisitHandler } from '$lib/server/visitCount';

const prisma = DBClient.getInstance().prisma;

const rateLimiter = new RateLimiterMemory({
  points: 2, // 2 requests
  duration: 60 * 5 // 5 minutes
});

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const { limit, offset } = parsePagination(url.searchParams, 20);

  const searchPattern = `%${search}%`;

  const maps = await prisma.$queryRaw<SearchMap[]>`
    SELECT id, name, icon FROM maps WHERE name LIKE ${searchPattern} OR id LIKE ${searchPattern} LIMIT ${limit} OFFSET ${offset}`;

  const mapsCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM maps WHERE name LIKE ${searchPattern} OR id LIKE ${searchPattern}`;
  const total = Number(mapsCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ maps, total });
}) satisfies RequestHandler;

export const POST = createVisitHandler({
  noun: 'map',
  rateLimiter,
  increment: (id) =>
    prisma.maps.updateMany({ where: { id }, data: { visit_count: { increment: 1 } } })
});
