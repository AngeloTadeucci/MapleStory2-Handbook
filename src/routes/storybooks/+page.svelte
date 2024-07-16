<script lang="ts">
  import { storyBooks } from '$lib/storyBooks';
</script>

<svelte:head>
  <title>MS2 Handbook - Story Books</title>
</svelte:head>

<div class="mt-8 h-[1px]" />
<div class="main-container mx-4 rounded-xl px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Story Books</h1>
  <div class="flex flex-wrap gap-4">
    {#each Object.entries(storyBooks) as book}
      {#each Object.keys(book[1]) as lang}
        <div class="flex flex-col items-center">
          <h2 class="text-xl font-bold mb-2">Book {book[0]} - {lang.toUpperCase()}</h2>
          <a class="bg-white relative" href={`/storybooks/${book[0]}/${lang}`}>
            <img
              src={`/resource/storybooks/${book[0]}/${lang}/${book[1][lang]?.at(0)}`}
              alt=""
              class="w-[214px] h-[300px] cursor-pointer"
            />
          </a>
        </div>
      {/each}
    {/each}
  </div>
</div>
