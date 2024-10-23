<script lang="ts">
  import Link from '$lib/components/Link.svelte';
  import { toReadableStat, type Npc } from '../../types/Npc';
  import ItemListContainer from '../item/ItemListContainer.svelte';
  import NpcImage from './NpcImage.svelte';

  interface Props {
    npc: Npc;
  }

  let { npc }: Props = $props();
  // todo:
  // - skills

  let toggleStats: boolean = $state(false);
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
    {#if npc.field_metadata?.length > 0}
      <hr class="my-4" />
      <div class="flex flex-col">
        {#if npc.npc_type === 0}
          Main Habitat:
        {:else}
          Found in:
        {/if}
        <div>
          {#each npc.field_metadata as field, index}
            <Link href={`/maps/${field.Item2}`}>
              {field.Item1}
            </Link>
            {#if index < npc.field_metadata.length - 1}
              <span class="-ml-1">, </span>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</ItemListContainer>

<style lang="scss">
  ul {
    list-style-type: disc;
    list-style-position: inside;
  }

  .text-ascendant {
    color: #ff8c37;
  }

  .limit-size {
    &--active {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
</style>
