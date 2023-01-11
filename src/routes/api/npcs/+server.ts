import { json } from '@sveltejs/kit';
import type { SearchNpc } from 'src/types/Npc';
import type { RequestHandler } from './$types';
import DBClient from '$lib/prismaClient';
const prisma = DBClient.getInstance().prisma;

export const GET = (async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const limit = Number(url.searchParams.get('limit') ?? 20);

	const searchString = `'%${search}%'`;

	const npcs = await prisma.$queryRawUnsafe<SearchNpc[]>(
		`SELECT id, name, portrait FROM maple2_codex.npcs WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${
			Number(url.searchParams.get('page') ?? 0) * 20
		}`
	);

	return json(npcs);
}) satisfies RequestHandler;
