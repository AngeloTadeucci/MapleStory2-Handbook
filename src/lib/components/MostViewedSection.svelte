<script lang="ts">
  import ItemImage from './item/ItemImage.svelte';
  import NpcImage from './npc/NpcImage.svelte';
  import MapImage from './MapImage.svelte';
  import TrophyImage from './trophies/TrophyImage.svelte';
  import { url } from '../helpers/addBasePath';

  interface Props {
    title: string;
    items: any[];
    type: string;
  }

  let { title, items, type }: Props = $props();
</script>

<div
  class="main-container flex w-full flex-col items-center justify-center rounded-md px-5 pb-5 lg:mx-5 lg:justify-center"
>
  <h1 class="mb-5 mt-3">{title}</h1>
  <div class="flex w-full flex-col">
    {#each items as item}
      <div class="w-full border-b border-gray2 py-3 last:border-none hover:bg-surface-hover-token">
        <a class="unstyled flex flex-row items-center" href={url(`/${type}/${item.id}`)}>
          {#if type === 'items'}
            <ItemImage
              iconPath={item.icon_path}
              name={item.name}
              rarity={item.rarity}
              isOutfit={item.is_outfit === 1}
            />
          {:else if type === 'npcs'}
            <NpcImage portrait={item.portrait} name={item.name} />
          {:else if type === 'maps'}
            <MapImage icon={item.icon} name={item.name} />
          {:else if type === 'trophies'}
            <TrophyImage icon={item.icon} name={item.name} />
          {/if}
          <p class="ml-8 line-clamp-1 w-3/4">{item.name}</p>
        </a>
      </div>
    {/each}
  </div>
</div>
