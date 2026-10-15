import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchQuest } from '$lib/types/Quest';
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
  const questTypeString = url.searchParams.get('questType');
  const minQuestLevel = url.searchParams.get('minQuestLevel');
  const maxQuestLevel = url.searchParams.get('maxQuestLevel');
  const minRequiredLevel = url.searchParams.get('minRequiredLevel');
  const maxRequiredLevel = url.searchParams.get('maxRequiredLevel');
  const hasPrerequisites = url.searchParams.get('hasPrerequisites') === 'true';

  const searchPattern = `%${search}%`;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`(name LIKE ${searchPattern} OR id LIKE ${searchPattern} OR description LIKE ${searchPattern} OR manualDescription LIKE ${searchPattern} OR completeDescription LIKE ${searchPattern})`,
    inListCondition('questType', questTypeString)
  ];

  if (minQuestLevel && Number.isFinite(Number(minQuestLevel))) {
    conditions.push(Prisma.sql` AND questLevel >= ${Number(minQuestLevel)}`);
  }

  if (maxQuestLevel && Number.isFinite(Number(maxQuestLevel))) {
    conditions.push(Prisma.sql` AND questLevel <= ${Number(maxQuestLevel)}`);
  }

  if (minRequiredLevel && Number.isFinite(Number(minRequiredLevel))) {
    conditions.push(Prisma.sql` AND requiredLevel >= ${Number(minRequiredLevel)}`);
  }

  if (maxRequiredLevel && Number.isFinite(Number(maxRequiredLevel))) {
    conditions.push(Prisma.sql` AND requiredLevel <= ${Number(maxRequiredLevel)}`);
  }

  if (hasPrerequisites) {
    conditions.push(Prisma.sql` AND JSON_LENGTH(requiredQuest) > 0`);
  }

  const where = Prisma.join(conditions, '');

  const quests = await prisma.$queryRaw<SearchQuest[]>`
    SELECT id, name FROM quests WHERE ${where} LIMIT ${limit} OFFSET ${offset}`;

  const questCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM quests WHERE ${where}`;
  const total = Number(questCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ quests, total });
}) satisfies RequestHandler;

export const POST = createVisitHandler({
  noun: 'quest',
  rateLimiter,
  increment: (id) =>
    prisma.quests.updateMany({ where: { id }, data: { visit_count: { increment: 1 } } })
});
