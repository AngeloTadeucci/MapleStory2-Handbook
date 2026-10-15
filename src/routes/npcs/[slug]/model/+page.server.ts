import DBClient from '$lib/prismaClient';
import { assertFound, parseIdSlug } from '$lib/server/slug';
import type { PageServerLoad } from './$types';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const id = parseIdSlug(params.slug);

  const npc = assertFound(
    await prisma.npcs.findFirst({
      where: {
        id
      }
    })
  );

  return {
    props: {
      npc
    }
  };
}) satisfies PageServerLoad;
