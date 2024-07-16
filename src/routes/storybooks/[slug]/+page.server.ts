import { storyBooks } from '$lib/storyBooks';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ params }) => {
  const { slug } = params;
  if (slug === undefined || Number.isNaN(Number(slug))) {
    throw redirect(303, '/storybooks');
  }

  const bookId = Number(slug);

  if (storyBooks[bookId] === undefined) {
    throw redirect(303, '/storybooks');
  }

  const languages = Object.keys(storyBooks[bookId]);
  if (languages.length === 0) {
    throw redirect(303, '/storybooks');
  }

  if (languages.length === 1) {
    throw redirect(303, `/storybooks/${bookId}/${languages[0]}`);
  }

  return {
    props: {
      bookId
    }
  };
}) satisfies PageServerLoad;
