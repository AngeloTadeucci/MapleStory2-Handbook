import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchItem } from '$lib/types/Item';
import { ItemTypes } from '$lib/itemTypes';
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
  const itemType = url.searchParams.get('type');
  const outfitOnly = url.searchParams.get('outfit') === 'true';
  const genderString = url.searchParams.get('gender');
  const setItemsOnly = url.searchParams.get('setItems') === 'true';

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

  if (itemType) {
    // Extract group and type from item IDs based on the formula:
    // Group = id / 10000000
    // Type = (id % 10000000) / 100000
    itemsStatement += buildItemTypeCondition(itemType);
  }

  if (outfitOnly) {
    itemsStatement += ` AND is_outfit = 1`;
  }

  if (genderString) {
    itemsStatement += ` AND gender IN (${genderString})`;
  }

  if (setItemsOnly) {
    itemsStatement += ` AND set_name != ''`;
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

  if (itemType) {
    countStatement += buildItemTypeCondition(itemType);
  }

  if (outfitOnly) {
    countStatement += ` AND is_outfit = 1`;
  }

  if (genderString) {
    countStatement += ` AND gender IN (${genderString})`;
  }

  if (setItemsOnly) {
    countStatement += ` AND set_name != ''`;
  }

  const itemCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countStatement);
  const total = Number(itemCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ items, total });
}) satisfies RequestHandler;

// Helper function to build the SQL condition for item types
function buildItemTypeCondition(itemType: string): string {
  // Parse the item type parameter
  const types = itemType.split(',');

  // Build conditions for each type
  const conditions = types.map((type) => {
    const typeKey = type.trim().toLowerCase();
    const itemTypeConfig = ItemTypes[typeKey];

    if (!itemTypeConfig) {
      return '(1 = 0)'; // Invalid type - condition that will never be true
    }

    // Special case for 'mount' which combines air and ground mounts
    if (typeKey === 'mount') {
      return `((FLOOR(id / 10000000) = 4 AND FLOOR((id % 10000000) / 100000) = 4) OR
              (FLOOR(id / 10000000) = 5 AND FLOOR((id % 10000000) / 100000) = 6))`;
    }

    // Handle group and type based on configuration
    const { group, type: typeValue } = itemTypeConfig;

    // Handle single group with single type
    if (!Array.isArray(typeValue) && typeof typeValue === 'number') {
      if (typeValue === -1) {
        // For types like badge where we only care about the group
        return `(FLOOR(id / 10000000) = ${group})`;
      }
      return `(FLOOR(id / 10000000) = ${group} AND FLOOR((id % 10000000) / 100000) = ${typeValue})`;
    }

    // Handle single group with multiple specific types
    if (Array.isArray(typeValue) && !Array.isArray(typeValue[0])) {
      const typeConditions = typeValue
        .map((t) => `FLOOR((id % 10000000) / 100000) = ${t}`)
        .join(' OR ');
      return `(FLOOR(id / 10000000) = ${group} AND (${typeConditions}))`;
    }

    // Handle single group with type ranges
    if (Array.isArray(typeValue) && Array.isArray(typeValue[0])) {
      const rangeConditions = typeValue
        .map((range) => {
          if (Array.isArray(range) && range.length === 2) {
            return `(FLOOR((id % 10000000) / 100000) >= ${range[0]} AND FLOOR((id % 10000000) / 100000) <= ${range[1]})`;
          }
          return null;
        })
        .filter(Boolean)
        .join(' OR ');

      return `(FLOOR(id / 10000000) = ${group} AND (${rangeConditions}))`;
    }

    return '(1 = 0)'; // Fallback
  });

  // Join all conditions with OR
  return ` AND (${conditions.join(' OR ')})`;
}

export const POST = (async (req) => {
  const itemId = req.url.searchParams.get('id');
  const isProduction = import.meta.env.PUBLIC_NODE_ENV === 'prod';

  if (itemId == null) {
    return new Response(isProduction ? '' : JSON.stringify({ message: 'No item id provided' }), {
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
      return new Response(isProduction ? '' : JSON.stringify({ message: 'Item not found' }), {
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
    return new Response(isProduction ? '' : JSON.stringify({ message: 'Too many requests' }), {
      status: 429
    });
  }
}) satisfies RequestHandler;
