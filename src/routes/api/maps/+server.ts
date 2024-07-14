import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchMap } from '$lib/types/Map';

const prisma = DBClient.getInstance().prisma;

const rateLimiter = new RateLimiterMemory({
  points: 2, // 2 requests
  duration: 60 * 5 // 5 minutes
});

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('page') ?? 0) * limit;

  if (search.includes('"')) {
    return json({ maps: [], total: 0 });
  }

  const searchString = `"%${search}%"`;

  const mapsStatement = `SELECT id, name, icon FROM maps WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${offset}`;
  const maps = await prisma.$queryRawUnsafe<SearchMap[]>(mapsStatement);

  const totalStatement = `SELECT COUNT(*) as count FROM maps WHERE name LIKE ${searchString} OR id LIKE ${searchString}`;
  const mapsCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(totalStatement);
  const total = Number(mapsCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ maps, total });
}) satisfies RequestHandler;

export const POST = (async (req) => {
  const mapId = req.url.searchParams.get('id');
  if (mapId == null) {
    return new Response(JSON.stringify({ message: 'No map id provided' }), {
      status: 400
    });
  }
  const userIp = req.getClientAddress();
  const key = `${mapId}-${userIp}`;

  try {
    await rateLimiter.consume(key);

    const map = await prisma.maps.findUnique({
      where: {
        id: Number(mapId)
      }
    });

    if (map == null) {
      return new Response(JSON.stringify({ message: 'Map not found' }), {
        status: 404
      });
    }

    await prisma.maps.update({
      where: {
        id: Number(mapId)
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
