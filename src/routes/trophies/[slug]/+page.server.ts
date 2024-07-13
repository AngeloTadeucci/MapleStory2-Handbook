import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/trophies');
  }

  const trophy = await prisma.achieves.findFirst({
    where: {
      id: Number(slug)
    }
  });

  if (trophy === null || trophy === undefined) {
    throw redirect(303, '/trophies');
  }

  return {
    props: {
      trophy
    }
  };
}) satisfies PageServerLoad;
