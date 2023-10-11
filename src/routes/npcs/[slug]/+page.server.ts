import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/npcs');
  }

  const npc = await prisma.npcs.findFirst({
    where: {
      id: Number(slug)
    }
  });

  if (npc === null || npc === undefined) {
    throw redirect(303, '/npcs');
  }

  return {
    props: {
      npc
    }
  };
}) satisfies PageServerLoad;
