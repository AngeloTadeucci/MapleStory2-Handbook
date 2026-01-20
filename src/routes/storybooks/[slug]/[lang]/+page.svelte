<script lang="ts">
  import { url } from '$lib/helpers/addBasePath';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const images = $derived(data.props.images);
</script>

<svelte:head>
  <title>MS2 Handbook - Story Books</title>
</svelte:head>

<div class="mt-5 grid justify-center">
  <div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
    <h1>Book {data.props.bookId} - {data.props.lang.toUpperCase()}</h1>
    <div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row"></div>
    <div class="svelte-mz1063 lg:mt-7">
      {#each images as image}
        <img
          src={url(`/resource/image/storybooks/${data.props.bookId}/${data.props.lang}/${image}`)}
          alt=""
          class="mb-1"
        />
      {/each}
    </div>
  </div>
</div>
