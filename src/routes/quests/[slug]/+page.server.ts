import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
import type { QuestItem, Quest } from '$lib/types/Quest';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/trophies');
  }

  const quest = await prisma.quests.findFirst({
    where: {
      id: Number(slug)
    }
  });

  if (quest === null || quest === undefined) {
    throw redirect(303, '/quests');
  }

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

  if (result.startRewards) {
    if (result.startRewards.EssentialItem.length > 0) {
      for (const item of result.startRewards.EssentialItem) {
        await updateItem(item);
      }
    }

    if (result.startRewards.EssentialJobItem.length > 0) {
      for (const item of result.startRewards.EssentialJobItem) {
        await updateItem(item);
      }
    }
  }

  if (result.completeRewards) {
    if (result.completeRewards.EssentialItem.length > 0) {
      for (const item of result.completeRewards.EssentialItem) {
        await updateItem(item);
      }
    }

    if (result.completeRewards.EssentialJobItem.length > 0) {
      for (const item of result.completeRewards.EssentialJobItem) {
        await updateItem(item);
      }
    }
  }

  if (Array.isArray(quest.requiredQuest)) {
    const requiredQuests: {
      Id: number;
      Name: string;
    }[] = [];

    for (const requiredQuest of quest.requiredQuest) {
      const quest = await prisma.quests.findFirst({
        where: {
          id: requiredQuest as number
        }
      });
      if (quest) {
        requiredQuests.push({
          Id: quest.id,
          Name: quest.name
        });
      }
    }
    if (requiredQuests.length > 0) result.requiredQuest = requiredQuests;
  }

  if (Array.isArray(quest.selectableQuest)) {
    const selectableQuests: {
      Id: number;
      Name: string;
    }[] = [];

    for (const selectableQuest of quest.selectableQuest) {
      const quest = await prisma.quests.findFirst({
        where: {
          id: selectableQuest as number
        }
      });
      if (quest) {
        selectableQuests.push({
          Id: quest.id,
          Name: quest.name
        });
      }
    }
    if (selectableQuests.length > 0) result.selectableQuest = selectableQuests;
  }

  return {
    props: {
      quest: result,
      questMaps
    }
  };
}) satisfies PageServerLoad;

async function updateItem(item: QuestItem) {
  const essentialItem = await prisma.items.findFirst({
    where: {
      id: item.Id
    }
  });
  if (essentialItem) {
    item.Name = essentialItem.name;
    item.IconPath = essentialItem.icon_path;
    item.IsOutfit = essentialItem.is_outfit === 1;
  }
}
