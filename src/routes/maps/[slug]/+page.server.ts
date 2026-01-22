import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
import type { MapNpc, MapPortal, QuestMap } from '$lib/types/Map';

const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/maps');
  }

  const mapId = Number(slug);

  const map = await prisma.maps.findFirst({
    where: {
      id: mapId
    }
  });

  if (map === null || map === undefined) {
    throw redirect(303, '/maps');
  }

  // Fetch NPCs on this map with NPC details
  const mapNpcs = await prisma.$queryRaw<MapNpc[]>`
    SELECT mn.*, n.name as npc_name, n.portrait, n.npc_type, n.is_boss
    FROM map_npcs mn
    JOIN npcs n ON mn.npc_id = n.id
    WHERE mn.map_id = ${mapId}
    ORDER BY n.name ASC
  `;

  // Fetch portals with destination map names
  const mapPortals = await prisma.$queryRaw<MapPortal[]>`
    SELECT mp.*, m.name as destination_name
    FROM map_portals mp
    JOIN maps m ON mp.destination_map_id = m.id
    WHERE mp.map_id = ${mapId}
    ORDER BY m.name ASC
  `;

  // Fetch quests on this map
  const mapQuests = await prisma.$queryRaw<QuestMap[]>`
    SELECT qm.*, q.name as quest_name, q.questLevel as quest_level, q.requiredLevel as required_level
    FROM quest_maps qm
    JOIN quests q ON qm.quest_id = q.id
    WHERE qm.map_id = ${mapId}
    ORDER BY q.questLevel ASC, q.name ASC
  `;

  // Fetch revival and enter return map names if they exist
  let revivalReturnMap = null;
  let enterReturnMap = null;

  if (map.revival_return_map_id) {
    revivalReturnMap = await prisma.maps.findUnique({
      where: { id: map.revival_return_map_id },
      select: { id: true, name: true }
    });
  }

  if (map.enter_return_map_id) {
    enterReturnMap = await prisma.maps.findUnique({
      where: { id: map.enter_return_map_id },
      select: { id: true, name: true }
    });
  }

  return {
    props: {
      map,
      mapNpcs,
      mapPortals,
      mapQuests,
      revivalReturnMap,
      enterReturnMap
    }
  };
}) satisfies PageServerLoad;
