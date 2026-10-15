import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import type { QuestItem, Quest } from '$lib/types/Quest';
import { getQuestObjectives } from '$lib/server/questLinks';
import { assertFound, parseIdSlug, toDbIds } from '$lib/server/slug';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const id = parseIdSlug(params.slug);

  const quest = assertFound(
    await prisma.quests.findFirst({
      where: {
        id
      }
    })
  );

  // Fetch maps where this quest progresses
  const questMaps = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT DISTINCT m.id, m.name
    FROM quest_maps qm
    JOIN maps m ON qm.map_id = m.id
    WHERE qm.quest_id = ${quest.id}
    ORDER BY m.name ASC
  `;

  const result: Quest = quest as unknown as Quest;

  if (quest.startNpcId) {
    const startNpc = await prisma.npcs.findFirst({
      where: {
        id: quest.startNpcId
      }
    });
    if (startNpc) {
      result.startNpcName = startNpc.name;
    }
  }

  if (quest.completeNpcId) {
    const completeNpc = await prisma.npcs.findFirst({
      where: {
        id: quest.completeNpcId
      }
    });
    if (completeNpc) {
      result.completeNpcName = completeNpc.name;
    }
  }

  const rewardItems: QuestItem[] = [];
  for (const rewards of [result.startRewards, result.completeRewards]) {
    if (!rewards) continue;
    for (const list of [rewards.EssentialItem, rewards.EssentialJobItem]) {
      if (Array.isArray(list)) rewardItems.push(...list);
    }
  }
  const rewardItemIds = toDbIds(rewardItems.map((item) => item.Id));
  const essentialItems = new Map(
    (rewardItemIds.length
      ? await prisma.items.findMany({
          where: { id: { in: rewardItemIds } },
          select: { id: true, name: true, icon_path: true, is_outfit: true }
        })
      : []
    ).map((row) => [row.id, row])
  );
  for (const item of rewardItems) {
    const essentialItem = essentialItems.get(item.Id);
    if (essentialItem) {
      item.Name = essentialItem.name;
      item.IconPath = essentialItem.icon_path;
      item.IsOutfit = essentialItem.is_outfit === 1;
    }
  }

  const [requiredQuests, selectableQuests] = await Promise.all([
    findQuestLinks(quest.requiredQuest),
    findQuestLinks(quest.selectableQuest)
  ]);
  if (requiredQuests.length > 0) result.requiredQuest = requiredQuests;
  if (selectableQuests.length > 0) result.selectableQuest = selectableQuests;

  const objectives = await getQuestObjectives(prisma, quest.id);

  return {
    props: {
      quest: result,
      questMaps,
      objectives
    }
  };
}) satisfies PageServerLoad;

/** Id and name of each listed quest, in list order, skipping quests that do not exist. */
async function findQuestLinks(ids: unknown): Promise<{ Id: number; Name: string }[]> {
  if (!Array.isArray(ids)) return [];
  const uniqueIds = toDbIds(ids);
  if (uniqueIds.length === 0) return [];
  const rows = await prisma.quests.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true }
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const links: { Id: number; Name: string }[] = [];
  for (const id of ids) {
    const row = byId.get(id as number);
    if (row) links.push({ Id: row.id, Name: row.name });
  }
  return links;
}
