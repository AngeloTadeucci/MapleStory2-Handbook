import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchItem } from '$lib/types/Item';
const prisma = DBClient.getInstance().prisma;

const rateLimiter = new RateLimiterMemory({
  points: 2, // 2 requests
  duration: 60 * 5 // 5 minutes
});

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('page') ?? 0) * limit;
  const rarityString = url.searchParams.get('rarity');
  const jobString = url.searchParams.get('job');
  const slotString = url.searchParams.get('slot');

  if (search.includes('"')) {
    return json({ items: [], total: 0 });
  }

  const searchString = `"%${search}%"`;

  let itemsStatement = `SELECT id, name, rarity, icon_path, main_description, guide_description, tooltip_description, job_limit, item_preset, is_outfit FROM maple2_codex.items WHERE (name LIKE ${searchString} OR id LIKE ${searchString})`;
  if (rarityString) {
    // rarity in db is one single value, but we want to allow multiple rarities to be searched
    itemsStatement += ` AND rarity IN (${rarityString})`;
  }

  if (jobString) {
    itemsStatement += ` AND JSON_CONTAINS(job_limit, '[${jobString}]')`;
  }

  if (slotString) {
    // type in db is one single value, but we want to allow multiple types to be searched
    itemsStatement += ` AND item_preset IN (${slotString})`;
  }

  itemsStatement += ` LIMIT ${limit} OFFSET ${offset}`;
  const items = await prisma.$queryRawUnsafe<SearchItem[]>(itemsStatement);

  let countStatement = `SELECT COUNT(*) as count FROM maple2_codex.items WHERE (name LIKE ${searchString} OR id LIKE ${searchString})`;
  if (rarityString) {
    countStatement += ` AND rarity IN (${rarityString})`;
  }

  if (jobString) {
    countStatement += ` AND JSON_CONTAINS(job_limit, '[${jobString}]')`;
  }

  if (slotString) {
    countStatement += ` AND item_preset IN (${slotString})`;
  }

  const itemCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countStatement);
  const total = Number(itemCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ items, total });
}) satisfies RequestHandler;

export const POST = (async (req) => {
  const itemId = req.url.searchParams.get('id');
  if (itemId == null) {
    return new Response(JSON.stringify({ message: 'No item id provided' }), {
      status: 400
    });
  }
  const userIp = req.getClientAddress();
  const key = `${itemId}-${userIp}`;

  try {
    await rateLimiter.consume(key);

    const npc = await prisma.items.findUnique({
      where: {
        id: Number(itemId)
      }
    });

    if (npc == null) {
      return new Response(JSON.stringify({ message: 'Item not found' }), {
        status: 404
      });
    }

    await prisma.items.update({
      where: {
        id: Number(itemId)
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
