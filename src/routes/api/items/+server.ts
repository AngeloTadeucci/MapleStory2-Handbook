import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import type Item from 'src/types/Item';
import type { RequestHandler } from './$types';

export const GET = (async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const limit = Number(url.searchParams.get('limit') ?? 20);
	const prisma = new PrismaClient();

	const searchString = `'%${search}%'`;

	type SearchItem = Pick<
		Item,
		| 'id'
		| 'name'
		| 'rarity'
		| 'icon_path'
		| 'main_description'
		| 'guide_description'
		| 'tooltip_description'
	>;

	const items = await prisma.$queryRawUnsafe<SearchItem[]>(
		`SELECT id, name, rarity, icon_path, main_description, guide_description, tooltip_description FROM maple2_codex.items WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${
			Number(url.searchParams.get('page') ?? 0) * 20
		}`
	);

	return json(items);
}) satisfies RequestHandler;
