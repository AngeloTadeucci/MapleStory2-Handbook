import { json } from '@sveltejs/kit';
import type { SearchItem } from 'src/types/Item';
import type { RequestHandler } from './$types';
import DBClient from '$lib/prismaClient';
const prisma = DBClient.getInstance().prisma;

export const GET = (async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const limit = Number(url.searchParams.get('limit') ?? 20);

	const searchString = `'%${search}%'`;

	const items = await prisma.$queryRawUnsafe<SearchItem[]>(
		`SELECT id, name, rarity, icon_path, main_description, guide_description, tooltip_description FROM maple2_codex.items WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${
			Number(url.searchParams.get('page') ?? 0) * 20
		}`
	);

	return json(items);
}) satisfies RequestHandler;
