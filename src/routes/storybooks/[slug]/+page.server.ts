import { storyBooks } from '$lib/storyBooks';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { parseIdSlug } from '$lib/server/slug';

export const load = (async ({ params }) => {
  const bookId = parseIdSlug(params.slug);

  if (!Object.hasOwn(storyBooks, bookId)) {
    error(404, 'Not found');
  }

  const languages = Object.keys(storyBooks[bookId]);
  if (languages.length === 0) {
    error(404, 'Not found');
  }

  if (languages.length === 1) {
    redirect(303, `/storybooks/${bookId}/${languages[0]}`);
  }

  return {
    props: {
      bookId
    }
  };
}) satisfies PageServerLoad;
