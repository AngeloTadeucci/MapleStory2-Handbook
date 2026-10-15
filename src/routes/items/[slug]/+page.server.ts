import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import type Item from '$lib/types/Item';
import type { DroppedByEntry } from '$lib/types/Item';
import { getRequiredByQuests, getRewardedByQuests } from '$lib/server/questLinks';
import { assertFound, parseIdSlug, toDbIds } from '$lib/server/slug';
import { parseJsonColumn } from '$lib/server/jsonColumn';
const prisma = DBClient.getInstance().prisma;

interface BoxRow {
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

export const load = (async ({ params }) => {
  const id = parseIdSlug(params.slug);

  const item = assertFound(
    await prisma.items.findFirst({
      where: {
        id
      }
    })
  );

  // box_id 0 means the item is not a box, and item_boxes has no rows for it.
  const boxContent: BoxRow[] =
    item.box_id === 0
      ? []
      : await prisma.$queryRaw<BoxRow[]>`
    SELECT ib.*, i.name, i.icon_path, i.job_limit, i.job_recommend
    FROM item_boxes ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.box_id = ${item.box_id}
  `;

  // Each entry is { Item1: effect id, Item2: level }.
  const additionalEffects = parseJsonColumn(
    item.additional_effects,
    (value): value is Array<{ Item1?: unknown } | null> => Array.isArray(value),
    []
  );
  const effectIds = additionalEffects.map((effect) => effect?.Item1);
  const uniqueEffectIds = toDbIds(effectIds);
  const effectRows = new Map(
    (uniqueEffectIds.length
      ? await prisma.additional_effects.findMany({ where: { id: { in: uniqueEffectIds } } })
      : []
    ).map((row) => [row.id, row])
  );
  const additionalEffectDescriptions = [];
  for (const effectId of effectIds) {
    const description = typeof effectId === 'number' ? effectRows.get(effectId) : undefined;
    if (description === undefined) {
      continue;
    }
    additionalEffectDescriptions.push(description);
  }

  const furnishingShop =
    item.housing_category > 0
      ? await prisma.furnishing_shop.findUnique({
          where: {
            item_id: item.id
          }
        })
      : null;

  const droppedBy = await prisma.$queryRaw<DroppedByEntry[]>`
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
    WHERE dbi.item_id = ${item.id} OR dbi.item_id2 = ${item.id}
    ORDER BY n.is_boss DESC, n.level ASC, n.name ASC
    LIMIT 200
  `;

  const [requiredByQuests, rewardedByQuests] = await Promise.all([
    getRequiredByQuests(prisma, item.id),
    getRewardedByQuests(prisma, item.id)
  ]);

  const result: Item = item as unknown as Item;
  result.is_outfit = item.is_outfit === 1;
  result.furnishing_shop = furnishingShop;

  return {
    props: {
      item: result,
      boxContent,
      additionalEffectDescriptions,
      furnishingShop,
      droppedBy,
      requiredByQuests,
      rewardedByQuests
    }
  };
}) satisfies PageServerLoad;
