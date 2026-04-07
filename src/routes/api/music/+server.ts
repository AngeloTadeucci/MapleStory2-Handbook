import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';

const prisma = DBClient.getInstance().prisma;

export const GET = (async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const limit = Number(url.searchParams.get('limit') ?? 50);
	const offset = Number(url.searchParams.get('page') ?? 0) * limit;

	if (search.includes('"')) {
		return json({ tracks: [], total: 0 });
	}

	const searchString = `"%${search}%"`;

	const tracksStatement = `SELECT id, name, file_name, duration_seconds FROM bgm_tracks WHERE name LIKE ${searchString} ORDER BY name LIMIT ${limit} OFFSET ${offset}`;
	const tracks = await prisma.$queryRawUnsafe<
		{ id: number; name: string; file_name: string; duration_seconds: number }[]
	>(tracksStatement);

	const totalStatement = `SELECT COUNT(*) as count FROM bgm_tracks WHERE name LIKE ${searchString}`;
	const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(totalStatement);
	const total = Number(countResult[0].count);

	return json({ tracks, total });
}) satisfies RequestHandler;
