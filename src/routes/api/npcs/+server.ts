import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchNpc } from '$lib/types/Npc';
const prisma = DBClient.getInstance().prisma;

const rateLimiter = new RateLimiterMemory({
  points: 2, // 2 requests
  duration: 60 * 5 // 5 minutes
});

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('page') ?? 0) * limit;
  const npcTypeString = url.searchParams.get('npcType');
  const minLevel = url.searchParams.get('minLevel');
  const maxLevel = url.searchParams.get('maxLevel');
  const isBoss = url.searchParams.get('isBoss') === 'true';
  const hasShop = url.searchParams.get('hasShop') === 'true';

  if (search.includes('"')) {
    return json({ npcs: [], total: 0 });
  }

  const searchString = `"%${search}%"`;

  let npcsStatement = `SELECT id, name, portrait, title FROM maple2_codex.npcs WHERE (name LIKE ${searchString} OR id LIKE ${searchString})`;

  if (npcTypeString) {
    npcsStatement += ` AND npc_type IN (${npcTypeString})`;
  }

  if (minLevel) {
    npcsStatement += ` AND level >= ${Number(minLevel)}`;
  }

  if (maxLevel) {
    npcsStatement += ` AND level <= ${Number(maxLevel)}`;
  }

  if (isBoss) {
    npcsStatement += ` AND is_boss = 1`;
  }

  if (hasShop) {
    npcsStatement += ` AND shop_id > 0`;
  }

  npcsStatement += ` LIMIT ${limit} OFFSET ${offset}`;
  const npcs = await prisma.$queryRawUnsafe<SearchNpc[]>(npcsStatement);

  let totalStatement = `SELECT COUNT(*) as count FROM maple2_codex.npcs WHERE (name LIKE ${searchString} OR id LIKE ${searchString})`;

  if (npcTypeString) {
    totalStatement += ` AND npc_type IN (${npcTypeString})`;
  }

  if (minLevel) {
    totalStatement += ` AND level >= ${Number(minLevel)}`;
  }

  if (maxLevel) {
    totalStatement += ` AND level <= ${Number(maxLevel)}`;
  }

  if (isBoss) {
    totalStatement += ` AND is_boss = 1`;
  }

  if (hasShop) {
    totalStatement += ` AND shop_id > 0`;
  }

  const npcCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(totalStatement);
  const total = Number(npcCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ npcs, total });
}) satisfies RequestHandler;

export const POST = (async (req) => {
  const npcId = req.url.searchParams.get('id');
  if (npcId == null) {
    return new Response(JSON.stringify({ message: 'No npc id provided' }), {
      status: 400
    });
  }
  const userIp = req.getClientAddress();
  const key = `${npcId}-${userIp}`;

  try {
    await rateLimiter.consume(key);

    const npc = await prisma.npcs.findUnique({
      where: {
        id: Number(npcId)
      }
    });

    if (npc == null) {
      return new Response(JSON.stringify({ message: 'Npc not found' }), {
        status: 404
      });
    }

    await prisma.npcs.update({
      where: {
        id: Number(npcId)
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
