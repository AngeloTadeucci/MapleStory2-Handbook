<script lang="ts">
  import Link from '$lib/components/Link.svelte';
  import { toReadableStat, type Npc } from '../../types/Npc';
  import ItemListContainer from '../item/ItemListContainer.svelte';
  import NpcImage from './NpcImage.svelte';

  interface Props {
    npc: Npc;
    npcMaps?: Array<{ id: number; name: string }>;
  }

  let { npc, npcMaps = [] }: Props = $props();
  // todo:
  // - skills

  let toggleStats: boolean = $state(false);

  // Parse field_metadata if it's a string
  const fieldMetadata = $derived.by(() => {
    if (!npc.field_metadata) return [];
    if (typeof npc.field_metadata === 'string') {
      try {
        const parsed = JSON.parse(npc.field_metadata);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(npc.field_metadata) ? npc.field_metadata : [];
  });

  // Filter out maps already in fieldMetadata from npcMaps
  const filteredNpcMaps = $derived.by(() => {
    if (!fieldMetadata || fieldMetadata.length === 0) return npcMaps;
    const fieldMapIds = fieldMetadata.map((field: { Item1: string; Item2: number }) => field.Item2);
    return npcMaps.filter(map => !fieldMapIds.includes(map.id));
  });
</script>

<ItemListContainer>
  <div class="mb-2 flex">
    <NpcImage name={npc.name} portrait={npc.portrait} />
  </div>
  <div>
    <div class="flex flex-row gap-1">
      <p>Stats:</p>
      <button
        class="text-ascendant cursor-pointer"
        onclick={() => {
          toggleStats = !toggleStats;
        }}
      >
        [Click here to {toggleStats ? 'retract' : 'expand'}]
      </button>
    </div>
    <div class="limit-size {toggleStats ? '' : 'limit-size--active'}">
      <ul>
        {#each Object.entries(npc.stats) as [key, value]}
          {#if value > 0}
            <li>
              {toReadableStat(key)}: {Number(value).toLocaleString()}
            </li>
          {/if}
        {/each}
      </ul>
    </div>
  </div>
  <div class="flex flex-col mt-2">
    {#if npc.npc_type === 0}
      <div>
        Level: {npc.level}
      </div>
    {/if}
    {#if npc.class_name && npc.npc_type === 0}
      <div>
        Type: {npc.class_name}
      </div>
    {/if}
    {#if npc.race}
      <div>
        Category: {npc.race}
      </div>
    {/if}
    {#if npc.shop_id}
      <p>
        Shop ID: {npc.shop_id}
      </p>
    {/if}
    {#if fieldMetadata.length > 0}
      {@const validFields = fieldMetadata.filter((field: { Item1: string; Item2: number }) => field.Item1 && field.Item1.trim() !== '')}
      {#if validFields.length > 0}
        <hr class="my-4" />
        <div class="flex flex-col">
          {#if npc.npc_type === 0}
            Main Habitat:
          {:else}
            Found in:
          {/if}
          <div>
            {#each validFields as field, index}
              <Link href={`/maps/${field.Item2}`}>
                {field.Item1}
              </Link>
              {#if index < validFields.length - 1}
                <span class="-ml-1">, </span>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    {#if filteredNpcMaps.length > 0}
      <hr class="my-4" />
      <div class="flex flex-col">
        Also found at:
        <ul>
          {#each filteredNpcMaps as map}
            <li>
              <Link href={`/maps/${map.id}`}>
                {map.name}
              </Link>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</ItemListContainer>

<style>
  ul {
    list-style-type: disc;
    list-style-position: inside;
  }

  .text-ascendant {
    color: #ff8c37;
  }

  .limit-size--active {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
