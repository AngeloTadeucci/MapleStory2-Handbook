<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { Map } from '$lib/types/Map';
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';

  export let data: PageData;

  const map = data.props.map as unknown as Map;

  async function incrementViewCount() {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      await fetch(`/api/maps?id=${map.id}`, {
        method: 'POST'
      });
    } catch {}
  }

  onMount(async () => {
    if (!map) {
      return;
    }

    incrementViewCount();
  });

  const mapUrl = url(`/resource/images/map/${map.minimap}`);
</script>

<svelte:head>
  <title>MS2 Handbook - {map.name}</title>
  <!-- Open graph -->
  <meta property="og:title" content={map.name} />
  <meta property="og:description" content={map.name} />
  <meta property="og:image" content={url(`/resource/image/map/minimap/${map.minimap}`)} />
  <meta property="og:url" content={url(`/maps/${map.id}`)} />
</svelte:head>

<div class="bg-surface-500 bg-opacity-60 relative">
  {#if map.bg}
    <img
      src={url(`/resource/image/map/bg/${map.bg}`)}
      alt={map.name}
      class="absolute -z-10 w-full h-full"
    />
  {/if}
  <div class="grid justify-center">
    <div class="mt-5 ml-4 flex items-center gap-1">
      <a href="/npcs" class="unstyled underline">Map</a>
      &gt;
      <CopyId id={map.id} />
    </div>
    <div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
      <h1>{map.name}</h1>
      <div class="flex flex-col flex-wrap justify-start gap-8 gap-y-2 xl:flex-row">
        <ItemListContainer>More info soon tm</ItemListContainer>
        {#if map.minimap}
          <div
            class="px-3 pt-2 flex items-center justify-center border-gray-500 border-2 rounded-lg bg-surface-700"
          >
            <img src={url(`/resource/image/map/minimap/${map.minimap}`)} alt={map.name} class="" />
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
