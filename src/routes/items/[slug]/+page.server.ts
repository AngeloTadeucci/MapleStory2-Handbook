import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
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

  return {
    props: {
      item,
      boxContent
    }
  };
}) satisfies PageServerLoad;
