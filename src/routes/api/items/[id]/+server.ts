import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import { getDropTypeLabel, formatDropCount } from '$lib/helpers/drops';
import { getBoxContent, getDroppedBy } from '$lib/server/itemDrops';
import { getRequiredByQuests, getRewardedByQuests } from '$lib/server/questLinks';
import { assertFound, parseIdSlug } from '$lib/server/slug';
const prisma = DBClient.getInstance().prisma;

// Where an item comes from and what uses it, as JSON for other programs such as Lith's Discord bot.
// The item page shows the same lists, from the same queries.
export const GET = (async ({ params }) => {
  const id = parseIdSlug(params.id);
  const item = assertFound(
    await prisma.items.findFirst({
      where: { id },
      select: { id: true, name: true, rarity: true, box_id: true }
    })
  );

  const [droppedBy, requiredByQuests, rewardedByQuests, boxContent] = await Promise.all([
    getDroppedBy(prisma, item.id),
    getRequiredByQuests(prisma, item.id),
    getRewardedByQuests(prisma, item.id),
    getBoxContent(prisma, item.box_id)
  ]);

  return json({
    id: item.id,
    name: item.name,
    rarity: item.rarity,
    droppedBy: droppedBy.map((npc) => ({
      id: npc.id,
      name: npc.name,
      level: npc.level,
      isBoss: npc.is_boss === 1,
      dropType: getDropTypeLabel(npc.drop_type)
    })),
    requiredByQuests: requiredByQuests.map((quest) => ({
      id: quest.id,
      name: quest.name,
      requiredLevel: quest.requiredLevel
    })),
    rewardedByQuests: rewardedByQuests.map((quest) => ({
      id: quest.id,
      name: quest.name,
      rewardKind: quest.reward_kind,
      count: quest.count
    })),
    boxContent: boxContent.map((row) => ({
      id: row.item_id,
      name: row.name,
      rarity: row.rarity,
      count: formatDropCount(row.min_count, row.max_count)
    }))
  });
}) satisfies RequestHandler;
