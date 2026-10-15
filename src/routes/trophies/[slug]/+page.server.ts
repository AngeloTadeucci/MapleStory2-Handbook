import type { PageServerLoad } from './$types';
import DBClient from '$lib/prismaClient';
import { assertFound, parseIdSlug } from '$lib/server/slug';
import { parseJsonColumn } from '$lib/server/jsonColumn';
import type { Trophy, TrophyGrade } from '$lib/types/Trophy';
const prisma = DBClient.getInstance().prisma;

export const load = (async ({ params }) => {
  const id = parseIdSlug(params.slug);

  const trophy = assertFound(
    await prisma.achieves.findFirst({
      where: {
        id
      }
    })
  );

  const grades = parseJsonColumn(
    trophy.grades,
    (value): value is TrophyGrade[] => Array.isArray(value),
    []
  );

  const result: Trophy = {
    ...trophy,
    grades
  };

  return {
    props: {
      trophy: result
    }
  };
}) satisfies PageServerLoad;
