import type { PrismaClient } from '$lib/generated/prisma/client';
import type { DroppedByEntry } from '$lib/types/Item';

export interface BoxRow {
  uid: number;
  box_id: number;
  item_id: number;
  item_id2: number;
  min_count: number;
  max_count: number;
  rarity: number;
  smart_drop_rate: number;
  group_drop_id: number;
  name: string;
  icon_path: string;
  job_limit: string;
  job_recommend: string;
}

// What opening the box can give. box_id 0 means the item is not a box, and item_boxes has no rows for it.
export async function getBoxContent(prisma: PrismaClient, boxId: number): Promise<BoxRow[]> {
  if (boxId === 0) return [];
  return prisma.$queryRaw<BoxRow[]>`
    SELECT ib.*, i.name, i.icon_path, i.job_limit, i.job_recommend
    FROM item_boxes ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.box_id = ${boxId}
  `;
}

// NPCs whose drop boxes hold the item, bosses first.
export async function getDroppedBy(
  prisma: PrismaClient,
  itemId: number
): Promise<DroppedByEntry[]> {
  return prisma.$queryRaw<DroppedByEntry[]>`
    SELECT DISTINCT
        n.id,
        n.name,
        n.portrait,
        n.is_boss,
        n.level,
        ndb.drop_type
    FROM drop_box_items dbi
    INNER JOIN npc_drop_boxes ndb ON ndb.drop_box_id = dbi.drop_box_id
    INNER JOIN npcs n ON n.id = ndb.npc_id
    WHERE dbi.item_id = ${itemId} OR dbi.item_id2 = ${itemId}
    ORDER BY n.is_boss DESC, n.level ASC, n.name ASC
    LIMIT 200
  `;
}
