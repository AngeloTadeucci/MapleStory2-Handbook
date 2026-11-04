import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import type Item from '$lib/types/Item';
import { getBoxContent, getDroppedBy } from '$lib/server/itemDrops';
import { getRequiredByQuests, getRewardedByQuests } from '$lib/server/questLinks';
import { assertFound, parseIdSlug, toDbIds } from '$lib/server/slug';
import { parseJsonColumn } from '$lib/server/jsonColumn';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const id = parseIdSlug(params.slug);

  const item = assertFound(
    await prisma.items.findFirst({
      where: {
        id
      }
    })
  );

  const boxContent = await getBoxContent(prisma, item.box_id);

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

  const droppedBy = await getDroppedBy(prisma, item.id);

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
