import { json } from '@sveltejs/kit';
import type { SearchNpc } from 'src/types/Npc';
import type { RequestHandler } from './$types';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
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

	const npcs = await prisma.$queryRawUnsafe<SearchNpc[]>(
		`SELECT id, name, portrait FROM maple2_codex.npcs WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${
			Number(url.searchParams.get('page') ?? 0) * 20
		}`
	);

	return json(npcs);
}) satisfies RequestHandler;

export const POST = (async (req) => {
	const npcId = req.url.searchParams.get('id');
	if (npcId == null) {
		return new Response(JSON.stringify({ message: 'No npc id provided' }), {
			status: 400
		});
	}
	const userIp = req.getClientAddress();
	const key = `${npcId}-${userIp}`;

	try {
		await rateLimiter.consume(key);

		const npc = await prisma.npcs.findUnique({
			where: {
				id: Number(npcId)
			}
		});

		if (npc == null) {
			return new Response(JSON.stringify({ message: 'Npc not found' }), {
				status: 404
			});
		}

		await prisma.npcs.update({
			where: {
				id: Number(npcId)
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
