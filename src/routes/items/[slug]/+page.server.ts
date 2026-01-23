import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
import type Item from '$lib/types/Item';
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

  const result: Item = item as unknown as Item;
  result.is_outfit = item.is_outfit === 1;

  return {
    props: {
      item,
      boxContent,
      additionalEffectDescriptions
    }
  };
}) satisfies PageServerLoad;
