<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import type { PageData } from './$types';
  import TrophyImage from '$lib/components/TrophyImage.svelte';
  import TrophyDetails from '$lib/components/trophies/TrophyDetails.svelte';
  import { onMount } from 'svelte';

  export let data: PageData;

  const trophy = data.props.trophy as unknown as TrophyDetails;

  async function incrementViewCount() {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      await fetch(`/api/trophies?id=${trophy.id}`, {
        method: 'POST'
      });
    } catch {}
  }

  onMount(async () => {
    if (!trophy) {
      return;
    }

    incrementViewCount();
  });
</script>

<svelte:head>
  <title>MS2 Handbook - {trophy.name}</title>
  <!-- Open graph -->
  <meta property="og:title" content={trophy.name} />
  <meta property="og:description" content={trophy.name} />
  <meta property="og:image" content={url(`/${trophy.portrait.split('/').slice(2).join('/')}`)} />
  <meta property="og:url" content={url(`/trophies/${trophy.id}`)} />
</svelte:head>

<div class="mt-5 grid justify-center">
  <div class="ml-4 flex items-center gap-1">
    <a href="/trophies" class="unstyled underline">Trophies</a>
    &gt;
    <CopyId id={trophy.id} />
  </div>
  <div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
    <h1>{trophy.name}</h1>
    <div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row" />
    <div class="svelte-mz1063 lg:mt-7">
      <TrophyImage icon={trophy.icon} name={trophy.name} />
    </div>
  </div>
</div>
