import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { redirect } from '@sveltejs/kit';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/maps');
  }

  const map = await prisma.maps.findFirst({
    where: {
      id: Number(slug)
    }
  });

  if (map === null || map === undefined) {
    throw redirect(303, '/maps');
  }

  return {
    props: {
      map
    }
  };
}) satisfies PageServerLoad;
