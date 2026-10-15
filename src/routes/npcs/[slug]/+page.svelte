<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import NpcDetails from '$lib/components/npc/NpcDetails.svelte';
  import NpcDrops from '$lib/components/npc/NpcDrops.svelte';
  import NpcRequiredForQuests from '$lib/components/npc/NpcRequiredForQuests.svelte';
  import type { Npc } from '$lib/types/Npc';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import NpcRenderer from '$lib/components/npc/NpcRenderer.svelte';
  import getGltfUrl from '$lib/getGltfUrl';
  import SupportNotice from '$lib/components/SupportNotice.svelte';
  import { getImageUrl } from '$lib/getImageUrl';
  import { trackView } from '$lib/helpers/trackView';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const npc = $derived(data.props.npc as unknown as Npc);
  const npcMaps = $derived(data.props.npcMaps as Array<{ id: number; name: string }>);
  const npcDrops = $derived(data.props.npcDrops);
  const requiredForQuests = $derived(data.props.requiredForQuests);

  let gltfExists: boolean = $state(false);

  const gltfUrl = getGltfUrl();

  $effect(() => trackView('/api/npcs', npc.id));

  onMount(async () => {
    if (!npc) {
      return;
    }

    if (npc.kfm.length <= 0) {
      return;
    }
    try {
      const response = await fetch(`${gltfUrl}${npc.kfm}/${npc.kfm}.gltf`, {
        method: 'HEAD'
      });
      if (response.status === 404) {
        gltfExists = false;
      } else {
        gltfExists = true;
      }
    } catch {}
  });
</script>

<svelte:head>
  <title>MS2 Handbook - {npc.name}</title>
  <!-- Open graph -->
  <meta property="og:title" content={npc.name} />
  <meta property="og:description" content={npc.name} />
  <meta
    property="og:image"
    content={npc.portrait
      ? getImageUrl(npc.portrait.split('/').slice(2).join('/'))
      : 'https://handbook.tadeucci.dev/logo.png'}
  />
  <meta property="og:url" content={`https://handbook.tadeucci.dev/npcs/${npc.id}`} />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mt-5 grid justify-center">
  <div class="ml-4 flex items-center gap-1">
    <a href="/npcs" class="unstyled underline">NPC</a>
    &gt;
    <CopyId id={npc.id} />
  </div>
  <div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
    <h1>{npc.title ?? npc.title} {npc.name}</h1>
    <div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row">
      <div class="flex flex-col gap-8">
        <NpcDetails {npc} {npcMaps} />
        {#if npcDrops.length > 0}
          <NpcDrops drops={npcDrops} />
        {/if}
        {#if requiredForQuests.length > 0}
          <NpcRequiredForQuests quests={requiredForQuests} />
        {/if}
      </div>
      {#if npc.kfm.length > 0 && gltfExists}
        <div>
          <!-- One renderer for both layouts. Below sm it is a bordered box, from sm up it is the render_box.png frame. -->
          <div
            class="model rounded border border-[rgb(116,117,118)] bg-[rgb(32,33,34)] p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-3 sm:pb-0 sm:pt-2"
          >
            <NpcRenderer {npc} />
            <img
              src="/item/mouse_controls.png"
              class="absolute bottom-5 left-5 hidden md:block"
              alt="Mouse Controls"
            />
          </div>
        </div>
      {/if}
    </div>
    <SupportNotice />
  </div>
</div>

<style>
  @media (min-width: 640px) {
    .model {
      position: relative;
      background-image: url('/item/render_box.png');
      width: 575px;
      height: 799px;
    }
  }
</style>
