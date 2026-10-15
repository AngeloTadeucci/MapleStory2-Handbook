import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchNpc } from '$lib/types/Npc';
import { Prisma } from '$lib/generated/prisma/client';
import { inListCondition } from '$lib/server/sqlFilters';
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
  const npcTypeString = url.searchParams.get('npcType');
  const minLevel = url.searchParams.get('minLevel');
  const maxLevel = url.searchParams.get('maxLevel');
  const isBoss = url.searchParams.get('isBoss') === 'true';
  const hasShop = url.searchParams.get('hasShop') === 'true';

  const searchPattern = `%${search}%`;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`(name LIKE ${searchPattern} OR id LIKE ${searchPattern})`,
    inListCondition('npc_type', npcTypeString)
  ];

  if (minLevel && Number.isFinite(Number(minLevel))) {
    conditions.push(Prisma.sql` AND level >= ${Number(minLevel)}`);
  }

  if (maxLevel && Number.isFinite(Number(maxLevel))) {
    conditions.push(Prisma.sql` AND level <= ${Number(maxLevel)}`);
  }

  if (isBoss) {
    conditions.push(Prisma.sql` AND is_boss = 1`);
  }

  if (hasShop) {
    conditions.push(Prisma.sql` AND shop_id > 0`);
  }

  const where = Prisma.join(conditions, '');

  const npcs = await prisma.$queryRaw<SearchNpc[]>`
    SELECT id, name, portrait, title FROM npcs WHERE ${where} LIMIT ${limit} OFFSET ${offset}`;

  const npcCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM npcs WHERE ${where}`;
  const total = Number(npcCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ npcs, total });
}) satisfies RequestHandler;

export const POST = createVisitHandler({
  noun: 'npc',
  rateLimiter,
  increment: (id) =>
    prisma.npcs.updateMany({ where: { id }, data: { visit_count: { increment: 1 } } })
});
