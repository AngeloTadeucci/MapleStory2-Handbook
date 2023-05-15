import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SearchNpc } from '$lib/types/Npc';
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
		return json({ npcs: [], total: 0 });
	}

	const searchString = `"%${search}%"`;

	const npcsStatement = `SELECT id, name, portrait, title FROM maple2_codex.npcs WHERE name LIKE ${searchString} OR id LIKE ${searchString} LIMIT ${limit} OFFSET ${offset}`;
	const npcs = await prisma.$queryRawUnsafe<SearchNpc[]>(npcsStatement);

	const totalStatement = `SELECT COUNT(*) as count FROM maple2_codex.npcs WHERE name LIKE ${searchString} OR id LIKE ${searchString}`;
	const npcCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(totalStatement);
	const total = Number(npcCount[0].count); // bigint here cast as number since it'll never get that big uwu

	return json({ npcs, total });
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
