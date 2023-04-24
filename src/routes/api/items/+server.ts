import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchItem } from '../../../types/Item';
const prisma = DBClient.getInstance().prisma;

const rateLimiter = new RateLimiterMemory({
	points: 2, // 2 requests
	duration: 60 * 5 // 5 minutes
});

export const GET = (async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const limit = Number(url.searchParams.get('limit') ?? 20);

	if (search.includes('"')) {
		return json([]);
	}

	const searchString = `"%${search}%"`;

	const items = await prisma.$queryRawUnsafe<SearchItem[]>(
		`SELECT id, name, rarity, icon_path, main_description, guide_description, tooltip_description FROM maple2_codex.items WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${
			Number(url.searchParams.get('page') ?? 0) * 20
		}`
	);

	return json(items);
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
