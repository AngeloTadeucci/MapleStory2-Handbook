<script lang="ts">
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import { getQuestTypeName, type QuestLink } from '$lib/types/Quest';

  interface Props {
    quests: QuestLink[];
  }

  let { quests }: Props = $props();
</script>

<ItemListContainer gap={3}>
  <p class="font-semibold text-green">Required for Quests</p>
  <div class="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
    {#each quests as quest (quest.id)}
      <a
        href={`/quests/${quest.id}`}
        data-sveltekit-reload
        class="unstyled rounded p-2 transition-colors hover:bg-surface-600"
      >
        <p class="truncate font-semibold">{quest.name}</p>
        <p class="text-xs text-surface-400">
          Lv. {quest.requiredLevel} · {getQuestTypeName(quest.questType)}
        </p>
      </a>
    {/each}
  </div>
</ItemListContainer>
