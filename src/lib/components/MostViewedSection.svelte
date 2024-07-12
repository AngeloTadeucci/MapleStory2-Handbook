<!-- src/lib/components/MostViewedSection.svelte -->
<script lang="ts">
  import ItemImage from './ItemImage.svelte';
  import NpcImage from './NpcImage.svelte';
  import MapImage from './MapImage.svelte';
  import TrophyImage from './TrophyImage.svelte';
  import { url } from '../helpers/addBasePath';

  export let title: string;
  export let items: any[];
  export let type: string;
</script>

<div
  class="main-container flex w-full flex-col items-center justify-center rounded-md px-5 pb-5 lg:mx-5 lg:w-1/2 lg:justify-center"
>
  <h1 class="mb-5 mt-3 text-2xl">{title}</h1>
  <div class="flex w-full flex-col lg:w-3/4">
    {#each items as item}
      <div class="w-full border-b border-gray2 py-3 last:border-none hover:bg-surface-hover-token">
        <a class="unstyled flex flex-row items-center" href={url(`/${type}/${item.id}`)}>
          {#if type === 'items'}
            <ItemImage icon_path={item.icon_path} name={item.name} rarity={item.rarity} />
          {:else if type === 'npcs'}
            <NpcImage portrait={item.portrait} name={item.name} />
          {:else if type === 'maps'}
            <MapImage portrait="" name={item.name} />
          {:else if type === 'trophies'}
            <TrophyImage icon={item.icon} name={item.name} />
          {/if}
          <p class="ml-8 line-clamp-1 w-1/2 lg:w-3/4">{item.name}</p>
        </a>
      </div>
    {/each}
  </div>
</div>
