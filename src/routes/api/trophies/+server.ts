import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchTrophy } from '$lib/types/Trophy';
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

  const trophies = await prisma.$queryRaw<SearchTrophy[]>`
    SELECT id, name, icon FROM achieves WHERE name LIKE ${searchPattern} OR id LIKE ${searchPattern} LIMIT ${limit} OFFSET ${offset}`;

  const trophiesCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM achieves WHERE name LIKE ${searchPattern} OR id LIKE ${searchPattern}`;
  const total = Number(trophiesCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ trophies, total });
}) satisfies RequestHandler;

export const POST = createVisitHandler({
  noun: 'trophy',
  rateLimiter,
  increment: (id) =>
    prisma.achieves.updateMany({ where: { id }, data: { visit_count: { increment: 1 } } })
});
