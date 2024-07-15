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

  const boxContent = await prisma.item_boxes.findMany({
    where: {
      box_id: item.box_id
    },
    include: {
      item1: {
        select: {
          name: true,
          icon_path: true,
          job_limit: true,
          job_recommend: true
        }
      }
    }
  });

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
