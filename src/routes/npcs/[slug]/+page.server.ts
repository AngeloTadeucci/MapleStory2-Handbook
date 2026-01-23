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

  // Fetch maps where this NPC appears (check both map_npcs and map_mobs)
  const npcMaps = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT DISTINCT m.id, m.name
    FROM (
      SELECT map_id FROM map_npcs WHERE npc_id = ${npc.id}
      UNION
      SELECT map_id FROM map_mobs WHERE npc_id = ${npc.id}
    ) AS combined
    JOIN maps m ON combined.map_id = m.id
    ORDER BY m.name ASC
  `;

  return {
    props: {
      npc,
      npcMaps
    }
  };
}) satisfies PageServerLoad;
