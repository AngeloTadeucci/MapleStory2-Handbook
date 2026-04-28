<script lang="ts">
  import type { NpcDropEntry } from '$lib/types/Npc';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import { formatDropCount, getDropTypeLabel } from '$lib/helpers/drops';

  interface Props {
    drops: NpcDropEntry[];
  }

  let { drops }: Props = $props();

  const groupedDrops = $derived.by(() => {
    const buckets = new Map<number, NpcDropEntry[]>();
    for (const drop of drops) {
      const list = buckets.get(drop.drop_type) ?? [];
      list.push(drop);
      buckets.set(drop.drop_type, list);
    }
    return Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  });
</script>

<ItemListContainer gap={3}>
  <p class="font-semibold text-green">Drops</p>
  <div class="flex flex-col gap-4">
    {#each groupedDrops as [type, entries] (type)}
      <div class="flex flex-col gap-2">
        <p class="text-sm uppercase text-surface-300">{getDropTypeLabel(type)}</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {#each entries as drop (drop.id)}
            <a
              href={`/items/${drop.id}`}
              data-sveltekit-reload
              class="unstyled flex flex-col items-center gap-1 rounded p-2 transition-colors hover:bg-surface-600"
            >
              <ItemImage
                iconPath={drop.icon_path}
                rarity={drop.rarity}
                name={drop.name}
                minCount={drop.min_count}
                maxCount={drop.max_count}
                isOutfit={drop.is_outfit === 1}
              />
              <p class="line-clamp-2 text-center text-xs">{drop.name}</p>
              <p class="text-[10px] text-surface-400">{formatDropCount(drop.min_count, drop.max_count)}</p>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</ItemListContainer>
