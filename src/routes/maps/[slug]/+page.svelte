<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { Map, MapNpc, MapMob, MapPortal, QuestMap } from '$lib/types/Map';
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import SupportNotice from '$lib/components/SupportNotice.svelte';
  import NpcImage from '$lib/components/npc/NpcImage.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const map = $derived(data.props.map as unknown as Map);
  const mapNpcs = $derived(data.props.mapNpcs as MapNpc[]);
  const mapMobs = $derived(data.props.mapMobs as MapMob[]);
  const mapPortals = $derived(data.props.mapPortals as MapPortal[]);
  const mapQuests = $derived(data.props.mapQuests as QuestMap[]);
  const revivalReturnMap = $derived(
    data.props.revivalReturnMap as { id: number; name: string } | null
  );
  const enterReturnMap = $derived(data.props.enterReturnMap as { id: number; name: string } | null);

  // Search filters
  let npcSearch = $state('');
  let mobSearch = $state('');
  let portalSearch = $state('');
  let questSearch = $state('');

  // Get unique mobs by npc_id
  const uniqueMobs = $derived.by(() => {
    const mobMap = new Map<number, MapMob>();

    mapMobs.forEach((mob) => {
      if (!mobMap.has(mob.npc_id)) {
        mobMap.set(mob.npc_id, mob);
      }
    });

    return Array.from(mobMap.values());
  });

  // Filtered lists
  const filteredNpcs = $derived(
    mapNpcs.filter((npc) => (npc.npc_name ?? '').toLowerCase().includes(npcSearch.toLowerCase()))
  );

  const filteredMobs = $derived(
    uniqueMobs.filter((mob) => (mob.npc_name ?? '').toLowerCase().includes(mobSearch.toLowerCase()))
  );

  const filteredPortals = $derived(
    mapPortals.filter((portal) =>
      (portal.destination_name ?? '').toLowerCase().includes(portalSearch.toLowerCase())
    )
  );

  const filteredQuests = $derived(
    mapQuests.filter((quest) =>
      (quest.quest_name ?? '').toLowerCase().includes(questSearch.toLowerCase())
    )
  );

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
      <a href="/maps" class="unstyled underline">Map</a>
      &gt;
      <CopyId id={map.id} />
    </div>
    <div class="max-w-450 mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
      <h1>{map.name}</h1>
      <div class="flex flex-col flex-wrap justify-start items-start gap-6 xl:flex-row">
        <!-- Map Information Panel -->
        <ItemListContainer>
          <h2 class="text-xl font-bold mb-3">Map Information</h2>

          {#if map.description}
            <p class="mb-3">{map.description}</p>
          {/if}

          {#if map.recommended_level}
            <p class="mb-2">
              <span class="font-semibold">Recommended Level:</span>
              {map.recommended_level}
            </p>
          {/if}

          {#if map.max_capacity}
            <p class="mb-2">
              <span class="font-semibold">Max Capacity:</span>
              {map.max_capacity} players
            </p>
          {/if}

          <!-- {#if map.drop_rank}
            <p class="mb-2">
              <span class="font-semibold">Drop Rank:</span> {map.drop_rank}
            </p>
          {/if} -->

          <!-- Return maps -->
          {#if revivalReturnMap && enterReturnMap && revivalReturnMap.id === enterReturnMap.id}
            <p class="mb-2">
              <span class="font-semibold">Return Map:</span>
              <a
                href="/maps/{revivalReturnMap.id}"
                class="unstyled underline hover:text-primary-400"
              >
                {revivalReturnMap.name}
              </a>
            </p>
          {:else}
            {#if revivalReturnMap}
              <p class="mb-2">
                <span class="font-semibold">Revival Return Map:</span>
                <a
                  href="/maps/{revivalReturnMap.id}"
                  class="unstyled underline hover:text-primary-400"
                >
                  {revivalReturnMap.name}
                </a>
              </p>
            {/if}

            {#if enterReturnMap}
              <p class="mb-2">
                <span class="font-semibold">Enter Return Map:</span>
                <a
                  href="/maps/{enterReturnMap.id}"
                  class="unstyled underline hover:text-primary-400"
                >
                  {enterReturnMap.name}
                </a>
              </p>
            {/if}
          {/if}

          <!-- Features badges -->
          <div class="flex flex-wrap gap-2 mt-4">
            {#if map.death_penalty === 1}
              <span class="badge bg-red-600 text-white">Death Penalty</span>
            {:else if map.death_penalty === 0}
              <span class="badge bg-green-600 text-white">No Death Penalty</span>
            {/if}

            {#if map.flight_enabled === 1}
              <span class="badge bg-blue-600 text-white">Flight Enabled</span>
            {/if}

            {#if map.home_returnable === 1}
              <span class="badge bg-purple-600 text-white">Home Returnable</span>
            {/if}

            {#if map.is_tutorial_map === 1}
              <span class="badge bg-yellow-600 text-white">Tutorial Map</span>
            {/if}
          </div>
        </ItemListContainer>

        {#if map.minimap}
          <ItemListContainer>
            <img
              src={url(`/resource/image/map/minimap/${map.minimap.toLocaleLowerCase()}`)}
              alt={map.name}
              class="max-w-full max-h-120 object-contain"
            />
          </ItemListContainer>
        {/if}
      </div>

      <!-- Two column layout for NPCs, Mobs, Portals, and Quests -->
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- NPCs on this map -->
        <div class="flex flex-col min-w-0">
              <div class="column-wrapper">
                <ItemListContainer classname="scrollable-container">
                  <div class="flex flex-col gap-3 mb-4">
                    <div class="flex items-center gap-3">
                      <h2 class="text-xl font-bold w-1/3 min-w-[30%]">
                        NPCs
                        {#if npcSearch}
                          ({filteredNpcs.length}/{mapNpcs.length})
                        {/if}
                      </h2>
                      <input
                        type="text"
                        bind:value={npcSearch}
                        placeholder="Search..."
                        class="input flex-1 px-3 py-1 text-sm rounded bg-surface-600 border border-surface-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-2 column-content">
                    {#each filteredNpcs as mapNpc}
                      <a
                        href="/npcs/{mapNpc.npc_id}"
                        class="flex items-center gap-3 p-2 rounded hover:bg-surface-600 transition-colors"
                      >
                        <NpcImage
                          portrait={mapNpc.portrait ?? ''}
                          name={mapNpc.npc_name ?? 'Unknown'}
                        />
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold truncate">{mapNpc.npc_name ?? 'Unknown NPC'}</p>
                          {#if mapNpc.is_boss === 1}
                            <span class="badge variant-filled-error text-xs">Boss</span>
                          {/if}
                          {#if mapNpc.is_day_die === 1 || mapNpc.is_night_die === 1}
                            <p class="text-xs text-gray-400">
                              {#if mapNpc.is_day_die === 1}Day only{/if}
                              {#if mapNpc.is_night_die === 1}Night only{/if}
                            </p>
                          {/if}
                        </div>
                      </a>
                    {:else}
                      <p class="text-gray-400 text-center py-4">No NPCs found</p>
                    {/each}
                  </div>
                </ItemListContainer>
              </div>
            </div>

          <!-- Mobs on this map -->
          <div class="flex flex-col min-w-0">
            <div class="column-wrapper">
              <ItemListContainer classname="scrollable-container">
                <div class="flex flex-col gap-3 mb-4">
                  <div class="flex items-center gap-3">
                    <h2 class="text-xl font-bold w-1/3 min-w-[30%]">
                      Mobs
                      {#if mobSearch}
                        ({filteredMobs.length}/{uniqueMobs.length})
                      {/if}
                    </h2>
                      <input
                        type="text"
                        bind:value={mobSearch}
                        placeholder="Search..."
                        class="input flex-1 px-3 py-1 text-sm rounded bg-surface-600 border border-surface-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-2 column-content">
                    {#each filteredMobs as mapMob}
                      <a
                        href="/npcs/{mapMob.npc_id}"
                        class="flex items-center gap-3 p-2 rounded hover:bg-surface-600 transition-colors"
                      >
                        <NpcImage
                          portrait={mapMob.portrait ?? ''}
                          name={mapMob.npc_name ?? 'Unknown'}
                        />
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold truncate">{mapMob.npc_name ?? 'Unknown Mob'}</p>
                          <div class="flex flex-wrap gap-2 items-center">
                            {#if mapMob.level}
                              <span class="text-xs text-gray-400">Lv. {mapMob.level}</span>
                            {/if}
                            {#if mapMob.is_boss === 1}
                              <span class="badge variant-filled-error text-xs">Boss</span>
                            {/if}
                          </div>
                        </div>
                      </a>
                    {:else}
                      <p class="text-gray-400 text-center py-4">No mobs found</p>
                    {/each}
                  </div>
                </ItemListContainer>
              </div>
            </div>

          <!-- Portals on this map -->
          <div class="flex flex-col min-w-0">
              <div class="column-wrapper">
                <ItemListContainer classname="scrollable-container">
                  <div class="flex flex-col gap-3 mb-4">
                    <div class="flex items-center gap-3">
                      <h2 class="text-xl font-bold w-1/3 min-w-[30%]">
                        Portals
                        {#if portalSearch}
                          ({filteredPortals.length}/{mapPortals.length})
                        {/if}
                      </h2>
                      <input
                        type="text"
                        bind:value={portalSearch}
                        placeholder="Search..."
                        class="input flex-1 px-3 py-1 text-sm rounded bg-surface-600 border border-surface-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-3 column-content">
                    {#each filteredPortals as portal}
                      <div class="p-3 rounded bg-surface-600">
                        <a
                          href="/maps/{portal.destination_map_id}"
                          class="font-semibold unstyled underline hover:text-primary-400 wrap-break-word"
                        >
                          {portal.destination_name ?? `Map #${portal.destination_map_id}`}
                        </a>
                        {#if portal.name}
                          <p class="text-sm text-gray-400 truncate">Portal: {portal.name}</p>
                        {/if}
                        <div class="flex flex-wrap gap-2 mt-2">
                          {#if portal.is_visible === 0}
                            <span class="badge variant-filled-warning text-xs">Hidden</span>
                          {/if}
                          {#if portal.minimap_visible === 0}
                            <span class="badge variant-filled-secondary text-xs"
                              >Not on Minimap</span
                            >
                          {/if}
                        </div>
                      </div>
                    {:else}
                      <p class="text-gray-400 text-center py-4">No portals found</p>
                    {/each}
                  </div>
                </ItemListContainer>
              </div>
            </div>

          <!-- Quests on this map -->
            <div class="flex flex-col min-w-0">
              <div class="column-wrapper">
                <ItemListContainer classname="scrollable-container">
                  <div class="flex flex-col gap-3 mb-4">
                    <div class="flex items-center gap-3">
                      <h2 class="text-xl font-bold w-1/3 min-w-[30%]">
                        Quests
                        {#if questSearch}
                          ({filteredQuests.length}/{mapQuests.length})
                        {/if}
                      </h2>
                      <input
                        type="text"
                        bind:value={questSearch}
                        placeholder="Search..."
                        class="input flex-1 px-3 py-1 text-sm rounded bg-surface-600 border border-surface-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-3 column-content">
                    {#each filteredQuests as questMap}
                      <a
                        href="/quests/{questMap.quest_id}"
                        class="p-3 rounded bg-surface-600 hover:bg-surface-500 transition-colors"
                      >
                        <p class="font-semibold wrap-break-word">
                          {questMap.quest_name ?? 'Unknown Quest'}
                        </p>
                        {#if questMap.quest_level}
                          <p class="text-sm text-gray-400">Level {questMap.quest_level}</p>
                        {/if}
                        {#if questMap.required_level}
                          <p class="text-xs text-gray-500">
                            Required: Lv. {questMap.required_level}
                          </p>
                        {/if}
                      </a>
                    {:else}
                      <p class="text-gray-400 text-center py-4">No quests found</p>
                    {/each}
                  </div>
                </ItemListContainer>
              </div>
            </div>
        </div>

      <SupportNotice />
    </div>
  </div>
</div>

<style>
  /* Column wrapper with horizontal scroll if needed */
  .column-wrapper {
    overflow-x: auto;
    overflow-y: visible;
    min-width: 0;
    max-width: 100%;
  }

  /* Make ItemListContainer keep its original width */
  :global(.scrollable-container) {
    overflow: visible;
  }

  /* Just reduce padding to prevent content overflow */
  :global(.scrollable-container .box__middle) {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  /* Column content area - only scrollbar here */
  .column-content {
    max-height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Search input constraints */
  :global(.scrollable-container input.input) {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Custom scrollbar styling for the columns */
  :global(.scrollable-container),
  .column-content {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  :global(.scrollable-container::-webkit-scrollbar),
  .column-content::-webkit-scrollbar {
    width: 8px;
  }

  :global(.scrollable-container::-webkit-scrollbar-track),
  .column-content::-webkit-scrollbar-track {
    background: transparent;
  }

  :global(.scrollable-container::-webkit-scrollbar-thumb),
  .column-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  :global(.scrollable-container::-webkit-scrollbar-thumb:hover),
  .column-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
</style>
