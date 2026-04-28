<script lang="ts">
  import type { NpcDropEntry } from '$lib/types/Npc';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import { getDropTypeLabel } from '$lib/helpers/drops';

  interface Props {
    drops: NpcDropEntry[];
  }

  let { drops }: Props = $props();

  const hasMixedDropTypes = $derived(new Set(drops.map((d) => d.drop_type)).size > 1);
</script>

<ItemListContainer gap={3}>
  <p class="font-semibold text-green">Drops</p>
  <div class="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
    {#each drops as drop (drop.id + '-' + drop.drop_type)}
      <a
        href={`/items/${drop.id}`}
        data-sveltekit-reload
        class="unstyled flex items-center gap-3 rounded py-2 pr-2 transition-colors hover:bg-surface-600"
      >
        <ItemImage
          iconPath={drop.icon_path}
          rarity={drop.rarity}
          name={drop.name}
          minCount={drop.min_count}
          maxCount={drop.max_count}
          isOutfit={drop.is_outfit === 1}
        />
        <div class="flex min-w-0 flex-1 flex-col">
          <p class="font-semibold">{drop.name}</p>
          {#if hasMixedDropTypes}
            <p class="text-xs text-surface-400">{getDropTypeLabel(drop.drop_type)}</p>
          {/if}
        </div>
      </a>
    {/each}
  </div>
</ItemListContainer>
