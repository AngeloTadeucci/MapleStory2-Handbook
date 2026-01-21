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

  // April Fools: Only active on April 1st (UTC)
  const isAprilFools = () => {
    const now = new Date();
    return now.getUTCMonth() === 3 && now.getUTCDate() === 1; // Month is 0-indexed
  };

  const FROG_CHANCE = 0.15; // 15% chance per item

  const youngFrog = {
    id: 30000071,
    name: 'Young Frog',
    icon_path: './data/resource/image/item/icon/30000071.png',
    rarity: 1,
    is_outfit: 0
  };

  // Determine which items get "frog'd" (so it doesn't change on re-render)
  const froggedIndices = $derived(isAprilFools() ? new Set(
    items.map((_, i) => i).filter(() => Math.random() < FROG_CHANCE)
  ) : new Set<number>());

  const shouldShowFrog = (index: number) => froggedIndices.has(index);

  // Random chance to swap name vs image (50/50) - NOT BOTH
  const frogModes = $derived.by(() => {
    const modes = new Map<number, 'image' | 'name'>();
    froggedIndices.forEach(i => {
      modes.set(i, Math.random() < 0.5 ? 'image' : 'name');
    });
    return modes;
  });
  const frogMode = (index: number) => frogModes.get(index) ?? 'image';
</script>

<div
  class="main-container flex w-full flex-col items-center justify-center rounded-md px-5 pb-5 lg:mx-5 lg:justify-center"
>
  <h1 class="mb-5 mt-3">{title}</h1>
  <div class="flex w-full flex-col">
    {#each items as item, index}
      {@const isFrogged = shouldShowFrog(index)}
      {@const mode = frogMode(index)}
      {@const displayName = isFrogged && mode === 'name' ? 'Young Frog' : item.name}
      <div class="w-full border-b border-gray2 py-3 last:border-none hover:preset-tonal transition-colors">
        <a class="unstyled flex flex-row items-center" href={url(`/${type}/${item.id}`)}>
          {#if isFrogged && mode === 'image'}
            <ItemImage
              iconPath={youngFrog.icon_path}
              name={youngFrog.name}
              rarity={youngFrog.rarity}
              isOutfit={false}
            />
          {:else if type === 'items'}
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
          <p class="ml-8 line-clamp-1 w-3/4">{displayName}</p>
        </a>
      </div>
    {/each}
  </div>
</div>
