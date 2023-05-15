import DBClient from '../lib/prismaClient';
import type { PageServerLoad } from './$types';

const prisma = DBClient.getInstance().prisma;

export const load = (async () => {
	const mostViewedItems = await prisma.items.findMany({
		select: {
			id: true,
			name: true,
			icon_path: true,
			rarity: true
		},
		orderBy: {
			visit_count: 'desc'
		},
		take: 5
	});

	const mostViewedNpcs = await prisma.npcs.findMany({
		select: {
			id: true,
			name: true,
			portrait: true
		},
		orderBy: {
			visit_count: 'desc'
		},
		take: 5
	});
	return {
		props: {
			mostViewedItems,
			mostViewedNpcs
		}
	};
}) satisfies PageServerLoad;
