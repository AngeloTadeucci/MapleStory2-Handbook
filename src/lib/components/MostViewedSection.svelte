<script lang="ts">
  import ItemImage from './item/ItemImage.svelte';
  import NpcImage from './npc/NpcImage.svelte';
  import MapImage from './MapImage.svelte';
  import TrophyImage from './trophies/TrophyImage.svelte';

  // Each list passes a different select, so only the fields its type renders are present.
  interface MostViewedEntry {
    id: number;
    name: string;
    icon_path?: string;
    rarity?: number;
    is_outfit?: number;
    portrait?: string;
    icon?: string;
  }

  interface Props {
    title: string;
    items: MostViewedEntry[];
    type: string;
  }

  let { title, items, type }: Props = $props();
</script>

<div
  class="main-container flex w-full flex-col items-center justify-center rounded-md px-5 pb-5 lg:mx-5 lg:justify-center"
>
  <h1 class="mb-5 mt-3">{title}</h1>
  <div class="flex w-full flex-col">
    {#each items as item (item.id)}
      <div
        class="w-full border-b border-gray2 py-3 last:border-none hover:preset-tonal transition-colors"
      >
        <a class="unstyled flex flex-row items-center" href={`/${type}/${item.id}`}>
          {#if type === 'items'}
            <ItemImage
              iconPath={item.icon_path ?? ''}
              name={item.name}
              rarity={item.rarity ?? 1}
              isOutfit={item.is_outfit === 1}
            />
          {:else if type === 'npcs'}
            <NpcImage portrait={item.portrait ?? ''} name={item.name} />
          {:else if type === 'maps'}
            <MapImage icon={item.icon ?? ''} name={item.name} />
          {:else if type === 'trophies'}
            <TrophyImage icon={item.icon ?? ''} name={item.name} />
          {/if}
          <p class="ml-8 line-clamp-1 w-3/4">{item.name}</p>
        </a>
      </div>
    {/each}
  </div>
</div>
