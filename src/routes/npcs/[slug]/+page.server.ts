import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
import type { NpcDropEntry } from '$lib/types/Npc';
import { getRequiredForQuests } from '$lib/server/questLinks';
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

  const npcDropsRaw = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    icon_path: string;
    rarity: number;
    is_outfit: number;
    drop_type: number;
    min_count: number | bigint;
    max_count: number | bigint;
  }>>`
    SELECT i.id, i.name, i.icon_path, i.rarity, i.is_outfit,
           ndb.drop_type,
           MIN(dbi.min_count) AS min_count,
           MAX(dbi.max_count) AS max_count
    FROM npc_drop_boxes ndb
    JOIN drop_box_items dbi ON dbi.drop_box_id = ndb.drop_box_id
    JOIN items i ON i.id = dbi.item_id
    WHERE ndb.npc_id = ${npc.id} AND dbi.item_id > 0
    GROUP BY i.id, i.name, i.icon_path, i.rarity, i.is_outfit, ndb.drop_type
    ORDER BY i.rarity DESC, i.name ASC
    LIMIT 500
  `;

  const npcDrops: NpcDropEntry[] = npcDropsRaw.map((row) => ({
    id: row.id,
    name: row.name,
    icon_path: row.icon_path,
    rarity: row.rarity,
    is_outfit: row.is_outfit,
    drop_type: row.drop_type,
    min_count: Number(row.min_count),
    max_count: Number(row.max_count),
  }));

  const requiredForQuests = await getRequiredForQuests(prisma, npc.id);

  return {
    props: {
      npc,
      npcMaps,
      npcDrops,
      requiredForQuests
    }
  };
}) satisfies PageServerLoad;
