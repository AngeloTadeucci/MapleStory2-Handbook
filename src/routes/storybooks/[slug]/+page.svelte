<script lang="ts">
  import { storyBooks } from '$lib/storyBooks';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>MS2 Handbook - Story Books</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Story Books</h1>
  <div class="flex flex-wrap gap-4">
    {#each Object.entries(storyBooks[data.props.bookId]) as book}
      <div class="flex flex-col items-center">
        <h2 class="text-xl font-bold mb-2">Book {data.props.bookId} - {book[0].toUpperCase()}</h2>
        <a class="bg-white" href={`/storybooks/${data.props.bookId}/${book[0]}`}>
          <img
            src={`/resource/image/storybooks/${data.props.bookId}/${book[0]}/${book[1]?.at(0)}`}
            alt=""
            class="w-53.5 h-75 cursor-pointer"
          />
        </a>
      </div>
    {/each}
  </div>
</div>
