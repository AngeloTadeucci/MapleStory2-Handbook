import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { parsePagination } from '$lib/server/pagination';

const prisma = DBClient.getInstance().prisma;

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  // No page requests this endpoint, the music page loads tracks server side.
  const { limit, offset } = parsePagination(url.searchParams, 50, 100);

  const searchPattern = `%${search}%`;

  const tracks = await prisma.$queryRaw<
    { id: number; name: string; file_name: string; duration_seconds: number }[]
  >`
    SELECT id, name, file_name, duration_seconds FROM bgm_tracks WHERE name LIKE ${searchPattern} ORDER BY name LIMIT ${limit} OFFSET ${offset}`;

  const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM bgm_tracks WHERE name LIKE ${searchPattern}`;
  const total = Number(countResult[0].count);

  return json({ tracks, total });
}) satisfies RequestHandler;
