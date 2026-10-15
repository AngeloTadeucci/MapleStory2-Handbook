import { storyBooks } from '$lib/storyBooks';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { parseIdSlug } from '$lib/server/slug';

export const load = (async ({ params }) => {
  const { lang } = params;
  const bookId = parseIdSlug(params.slug);

  // The lang segment is user input, so a plain index would also match
  // inherited keys such as "constructor".
  if (!Object.hasOwn(storyBooks, bookId) || !Object.hasOwn(storyBooks[bookId], lang)) {
    error(404, 'Not found');
  }

  const images = storyBooks[bookId][lang];

  if (!images || images.length === 0) {
    error(404, 'Not found');
  }

  return {
    props: {
      images,
      bookId,
      lang
    }
  };
}) satisfies PageServerLoad;
