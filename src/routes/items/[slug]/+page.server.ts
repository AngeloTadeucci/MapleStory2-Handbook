import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
import type Item from '$lib/types/Item';
import type { DroppedByEntry } from '$lib/types/Item';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/items');
  }

  const item = await prisma.items.findFirst({
    where: {
      id: Number(slug)
    }
  });

  if (item === null || item === undefined) {
    throw redirect(303, '/items');
  }

  const boxContent = await prisma.$queryRaw<Array<{
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
  }>>`
    SELECT ib.*, i.name, i.icon_path, i.job_limit, i.job_recommend
    FROM item_boxes ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.box_id = ${item.box_id}
  `;

  const additionalEffectDescriptions = [];
  if (item.additional_effects) {
    const additionalEffects = JSON.parse(item.additional_effects);
    for (const effect of additionalEffects) {
      const description = await prisma.additional_effects.findFirst({
        where: {
          id: effect.Item1
        }
      });
      if (description === null || description === undefined) {
        continue;
      }
      additionalEffectDescriptions.push(description);
    }
  }

  const furnishingShop =
    item.housing_category > 0
      ? await prisma.furnishing_shop.findUnique({
          where: {
            item_id: item.id
          }
        })
      : null;

  const droppedByRaw = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    portrait: string;
    is_boss: number;
    level: number;
    drop_type: number | bigint;
  }>>`
    SELECT n.id, n.name, n.portrait, n.is_boss, n.level,
           MIN(ndb.drop_type) AS drop_type
    FROM drop_box_items dbi
    JOIN npc_drop_boxes ndb ON ndb.drop_box_id = dbi.drop_box_id
    JOIN npcs n ON n.id = ndb.npc_id
    WHERE dbi.item_id = ${item.id} OR dbi.item_id2 = ${item.id}
    GROUP BY n.id, n.name, n.portrait, n.is_boss, n.level
    ORDER BY n.is_boss DESC, n.level ASC, n.name ASC
    LIMIT 200
  `;

  const droppedBy: DroppedByEntry[] = droppedByRaw.map((row) => ({
    id: row.id,
    name: row.name,
    portrait: row.portrait,
    is_boss: row.is_boss,
    level: row.level,
    drop_type: Number(row.drop_type),
  }));

  const result: Item = item as unknown as Item;
  result.is_outfit = item.is_outfit === 1;
  result.furnishing_shop = furnishingShop;

  return {
    props: {
      item: result,
      boxContent,
      additionalEffectDescriptions,
      furnishingShop,
      droppedBy
    }
  };
}) satisfies PageServerLoad;
