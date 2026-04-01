import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { getBgmCategory } from '$lib/helpers/bgm';

const prisma = DBClient.getInstance().prisma;

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const category = url.searchParams.get('category') ?? 'all';
	const sort = url.searchParams.get('sort') ?? 'name';

	const orderBy =
		sort === 'duration'
			? { duration_seconds: 'desc' as const }
			: sort === 'duration-asc'
				? { duration_seconds: 'asc' as const }
				: { name: 'asc' as const };

	const where = search
		? { name: { contains: search } }
		: {};

	const tracks = await prisma.bgm_tracks.findMany({
		where,
		select: {
			id: true,
			name: true,
			file_name: true,
			duration_seconds: true
		},
		orderBy
	});

	let mapped = tracks.map((t) => ({
		id: t.id,
		name: t.name,
		fileName: t.file_name,
		durationSeconds: Number(t.duration_seconds)
	}));

	if (category !== 'all') {
		mapped = mapped.filter((t) => getBgmCategory(t.name) === category);
	}

	return {
		tracks: mapped,
		search,
		category,
		sort
	};
};
