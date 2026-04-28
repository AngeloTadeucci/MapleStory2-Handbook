<script lang="ts">
  import type { DroppedByEntry } from '$lib/types/Item';
  import NpcImage from '$lib/components/npc/NpcImage.svelte';
  import { getDropTypeLabel } from '$lib/helpers/drops';
  import ItemListContainer from './ItemListContainer.svelte';

  interface Props {
    droppedBy: DroppedByEntry[];
  }

  let { droppedBy }: Props = $props();
</script>

<ItemListContainer gap={3}>
  <p class="font-semibold text-green">Dropped By</p>
  <div class="flex flex-col gap-2">
    {#each droppedBy as npc (npc.id + '-' + npc.drop_type)}
      <a
        href={`/npcs/${npc.id}`}
        data-sveltekit-reload
        class="unstyled flex items-center gap-3 rounded p-2 transition-colors hover:bg-surface-600"
      >
        <NpcImage name={npc.name} portrait={npc.portrait} />
        <div class="flex min-w-0 flex-1 flex-col">
          <p class="truncate font-semibold">
            {npc.name}
            {#if npc.is_boss === 1}
              <span class="ml-2 rounded bg-red-700 px-1 py-0.5 text-xs uppercase">Boss</span>
            {/if}
          </p>
          <p class="text-xs text-surface-400">
            Lv. {npc.level} · {getDropTypeLabel(npc.drop_type)}
          </p>
        </div>
      </a>
    {/each}
  </div>
</ItemListContainer>
