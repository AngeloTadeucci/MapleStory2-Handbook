<script lang="ts">
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import { getQuestTypeName, type QuestRewardLink } from '$lib/types/Quest';

  interface Props {
    quests: QuestRewardLink[];
  }

  let { quests }: Props = $props();

  const getRewardKindLabel = (kind: QuestRewardLink['reward_kind']) =>
    kind === 'start' ? 'Start Reward' : 'Complete Reward';
</script>

<ItemListContainer gap={3} width={430}>
  <p class="font-semibold text-green">Rewarded by Quests</p>
  <div class="flex flex-col gap-1">
    {#each quests as quest (`${quest.id}-${quest.reward_kind}`)}
      <a
        href={`/quests/${quest.id}`}
        data-sveltekit-reload
        class="unstyled rounded p-2 transition-colors hover:bg-surface-600"
      >
        <p class="truncate font-semibold">{quest.name}</p>
        <p class="text-xs text-surface-400">
          Lv. {quest.requiredLevel} · {getQuestTypeName(quest.questType)} · {getRewardKindLabel(
            quest.reward_kind
          )} ×{quest.count}
        </p>
      </a>
    {/each}
  </div>
</ItemListContainer>
