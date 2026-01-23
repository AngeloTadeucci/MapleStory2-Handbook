<script lang="ts">
  import { storyBooks } from '$lib/storyBooks';

  // Get unique book IDs with their available languages
  const booksWithLanguages = $derived(
    Object.entries(storyBooks).map(([id, langs]) => ({
      id,
      languages: Object.keys(langs)
        .map((l) => l.toUpperCase())
        .join('/'),
      firstLang: Object.keys(langs)[0],
      firstImage: Object.values(langs)[0]?.at(0)
    }))
  );
</script>

<svelte:head>
  <title>MS2 Handbook - Story Books</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Story Books</h1>
  <div class="flex flex-wrap gap-4 justify-center sm:justify-start">
    {#each booksWithLanguages as book}
      <div class="flex flex-col items-center w-full sm:w-auto">
        <h2 class="text-xl font-bold mb-2 text-center">Book {book.id}<br />{book.languages}</h2>
        <a class="relative bg-white" href={`/storybooks/${book.id}`}>
          <img
            src={`/resource/image/storybooks/${book.id}/${book.firstLang}/${book.firstImage}`}
            alt=""
            class="w-53.5 h-75 cursor-pointer mx-auto"
          />
        </a>
      </div>
    {/each}
  </div>
</div>
