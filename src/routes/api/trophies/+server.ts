import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchTrophy } from '$lib/types/Trophy';

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
    return json({ trophies: [], total: 0 });
  }

  const searchString = `"%${search}%"`;

  const trophiesStatement = `SELECT id, name, icon FROM achieves WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${offset}`;
  const trophies = await prisma.$queryRawUnsafe<SearchTrophy[]>(trophiesStatement);

  const totalStatement = `SELECT COUNT(*) as count FROM achieves WHERE name LIKE ${searchString} OR id LIKE ${searchString}`;
  const trophiesCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(totalStatement);
  const total = Number(trophiesCount[0].count); // bigint here cast as number since it'll never get that big uwu

  return json({ trophies: trophies, total });
}) satisfies RequestHandler;

export const POST = (async (req) => {
  const trophyId = req.url.searchParams.get('id');
  if (trophyId == null) {
    return new Response(JSON.stringify({ message: 'No trophy id provided' }), {
      status: 400
    });
  }
  const userIp = req.getClientAddress();
  const key = `${trophyId}-${userIp}`;

  try {
    await rateLimiter.consume(key);

    const trophy = await prisma.achieves.findUnique({
      where: {
        id: Number(trophyId)
      }
    });

    if (trophy == null) {
      return new Response(JSON.stringify({ message: 'Trophy not found' }), {
        status: 404
      });
    }

    await prisma.achieves.update({
      where: {
        id: Number(trophyId)
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
