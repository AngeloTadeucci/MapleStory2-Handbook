import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchQuest } from '$lib/types/Quest';
const prisma = DBClient.getInstance().prisma;

const rateLimiter = new RateLimiterMemory({
  points: 2, // 2 requests
  duration: 60 * 5 // 5 minutes
});

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('page') ?? 0) * limit;
  const questTypeString = url.searchParams.get('questType');
  const minQuestLevel = url.searchParams.get('minQuestLevel');
  const maxQuestLevel = url.searchParams.get('maxQuestLevel');
  const minRequiredLevel = url.searchParams.get('minRequiredLevel');
  const maxRequiredLevel = url.searchParams.get('maxRequiredLevel');
  const hasPrerequisites = url.searchParams.get('hasPrerequisites') === 'true';

  if (search.includes('"')) {
    return json({ quests: [], total: 0 });
  }

  const searchString = `"%${search}%"`;

  let questsStatement = `SELECT id, name FROM maple2_codex.quests WHERE (name LIKE ${searchString} OR id LIKE ${searchString} OR description LIKE ${searchString} OR manualDescription LIKE ${searchString} OR completeDescription LIKE ${searchString})`;

  if (questTypeString) {
    questsStatement += ` AND questType IN (${questTypeString})`;
  }

  if (minQuestLevel) {
    questsStatement += ` AND questLevel >= ${Number(minQuestLevel)}`;
  }

  if (maxQuestLevel) {
    questsStatement += ` AND questLevel <= ${Number(maxQuestLevel)}`;
  }

  if (minRequiredLevel) {
    questsStatement += ` AND requiredLevel >= ${Number(minRequiredLevel)}`;
  }

  if (maxRequiredLevel) {
    questsStatement += ` AND requiredLevel <= ${Number(maxRequiredLevel)}`;
  }

  if (hasPrerequisites) {
    questsStatement += ` AND JSON_LENGTH(requiredQuest) > 0`;
  }

  questsStatement += ` LIMIT ${limit} OFFSET ${offset}`;
  const quests = await prisma.$queryRawUnsafe<SearchQuest[]>(questsStatement);

  let totalStatement = `SELECT COUNT(*) as count FROM maple2_codex.quests WHERE (name LIKE ${searchString} OR id LIKE ${searchString})`;

  if (questTypeString) {
    totalStatement += ` AND questType IN (${questTypeString})`;
  }

  if (minQuestLevel) {
    totalStatement += ` AND questLevel >= ${Number(minQuestLevel)}`;
  }

  if (maxQuestLevel) {
    totalStatement += ` AND questLevel <= ${Number(maxQuestLevel)}`;
  }

  if (minRequiredLevel) {
    totalStatement += ` AND requiredLevel >= ${Number(minRequiredLevel)}`;
  }

  if (maxRequiredLevel) {
    totalStatement += ` AND requiredLevel <= ${Number(maxRequiredLevel)}`;
  }

  if (hasPrerequisites) {
    totalStatement += ` AND JSON_LENGTH(requiredQuest) > 0`;
  }

  const questCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(totalStatement);
  const total = Number(questCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ quests, total });
}) satisfies RequestHandler;

export const POST = (async (req) => {
  const questId = req.url.searchParams.get('id');
  if (questId == null) {
    return new Response(JSON.stringify({ message: 'No quest id provided' }), {
      status: 400
    });
  }
  const userIp = req.getClientAddress();
  const key = `${questId}-${userIp}`;

  try {
    await rateLimiter.consume(key);

    const quest = await prisma.quests.findUnique({
      where: {
        id: Number(questId)
      }
    });

    if (quest == null) {
      return new Response(JSON.stringify({ message: 'Quest not found' }), {
        status: 404
      });
    }

    await prisma.quests.update({
      where: {
        id: Number(questId)
      },
      data: {
        visit_count: {
          increment: 1
        }
      }
    });

    return new Response();
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Too many requests' }), {
      status: 429
    });
  }
}) satisfies RequestHandler;
