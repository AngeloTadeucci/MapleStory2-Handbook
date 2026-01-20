<script lang="ts">
  import ModelOnlyRenderer from '$lib/components/ModelOnlyRenderer.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import type { Npc } from '$lib/types/Npc';
  import type { PageData } from './$types';
  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const npc = $derived(data.props.npc as unknown as Npc);
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
    <LoadingSpinner />
  </div>
{/if}
