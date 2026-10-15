import DBClient from '../lib/prismaClient';
import type { PageServerLoad } from './$types';

const prisma = DBClient.getInstance().prisma;

const CACHE_TTL_MS = 60_000;

async function loadMostViewed() {
  const [mostViewedItems, mostViewedNpcs, mostViewedMaps, mostViewedTrophies] = await Promise.all([
    prisma.items.findMany({
      select: {
        id: true,
        name: true,
        icon_path: true,
        rarity: true,
        is_outfit: true
      },
      orderBy: {
        visit_count: 'desc'
      },
      take: 5
    }),
    prisma.npcs.findMany({
      select: {
        id: true,
        name: true,
        portrait: true
      },
      orderBy: {
        visit_count: 'desc'
      },
      take: 5
    }),
    prisma.maps.findMany({
      select: {
        id: true,
        name: true,
        icon: true
      },
      orderBy: {
        visit_count: 'desc'
      },
      take: 5
    }),
    prisma.achieves.findMany({
      select: {
        id: true,
        name: true,
        icon: true
      },
      orderBy: {
        visit_count: 'desc'
      },
      take: 5
    })
  ]);

  return {
    mostViewedItems,
    mostViewedNpcs,
    mostViewedMaps,
    mostViewedTrophies
  };
}

type MostViewed = Awaited<ReturnType<typeof loadMostViewed>>;

let cached: { expires: number; props: MostViewed } | null = null;
let inFlight: Promise<MostViewed> | null = null;

export const load = (async () => {
  if (cached === null || cached.expires <= Date.now()) {
    // Requests that arrive while a load is running share it. The cache is only
    // written on success, so a failed load is retried by the next request.
    inFlight ??= loadMostViewed()
      .then((props) => {
        cached = { props, expires: Date.now() + CACHE_TTL_MS };
        return props;
      })
      .finally(() => {
        inFlight = null;
      });
    return { props: await inFlight };
  }
  return { props: cached.props };
}) satisfies PageServerLoad;
