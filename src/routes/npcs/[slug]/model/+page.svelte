<script lang="ts">
  import ModelOnlyRenderer from '$lib/components/ModelOnlyRenderer.svelte';
  import type { Npc } from '$lib/types/Npc';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  export let data: PageData;

  const npc = data.props.npc as unknown as Npc;

  onMount(async () => {
    if (!npc) {
      return;
    }

    if (npc.kfm.length <= 0) {
      return;
    }
  });
</script>

<svelte:head>
  <title>MS2 Handbook - {npc.name} Model</title>
</svelte:head>

{#if npc.kfm.length > 0}
  <div class="">
    <ModelOnlyRenderer {npc} />
  </div>
{:else}
  <div class="flex items-center justify-center">
    <ProgressRadial width="w-32" />
  </div>
{/if}
