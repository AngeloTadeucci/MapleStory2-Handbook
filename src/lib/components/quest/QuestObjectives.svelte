<script lang="ts">
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import NpcImage from '$lib/components/npc/NpcImage.svelte';
  import {
    getObjectiveLabel,
    ITEM_OBJECTIVE_TYPES,
    NPC_OBJECTIVE_TYPES
  } from '$lib/helpers/quests';
  import type {
    QuestObjective,
    QuestObjectiveItem,
    QuestObjectiveNpc
  } from '$lib/types/Quest';

  interface Props {
    objectives: QuestObjective[];
  }

  let { objectives }: Props = $props();

  const itemTypes = new Set<string>(ITEM_OBJECTIVE_TYPES);
  const npcTypes = new Set<string>(NPC_OBJECTIVE_TYPES);

  function getItem(objective: QuestObjective, code: string | number): QuestObjectiveItem | undefined {
    return objective.items.find((item) => item.id === Number(code));
  }

  function getNpc(objective: QuestObjective, code: string | number): QuestObjectiveNpc | undefined {
    return objective.npcs.find((npc) => npc.id === Number(code));
  }

</script>

<div class="mb-4">
  <div class="mb-2 flex items-center gap-2">
    <img src="/quest/box.png" alt="" class="h-4 w-4" />
    <p>Objectives</p>
  </div>
  <div class="flex flex-col gap-2">
    {#each objectives as objective (objective.id)}
      {#if itemTypes.has(objective.condition_type)}
        {#each objective.codes as code (`${objective.id}-${code}`)}
          {@const item = getItem(objective, code)}
          {#if item}
            <a
              href={`/items/${item.id}`}
              data-sveltekit-reload
              class="unstyled flex items-center gap-3 rounded p-2 transition-colors hover:bg-surface-600"
            >
              <ItemImage
                iconPath={item.icon_path}
                rarity={item.rarity}
                name={item.name}
                minCount={objective.required_value}
                isOutfit={item.is_outfit === 1}
              />
              <p class="font-semibold">{item.name}</p>
            </a>
          {:else}
            <p>{getObjectiveLabel(objective.condition_type)}: {code}</p>
          {/if}
        {/each}
      {:else if npcTypes.has(objective.condition_type)}
        {#each objective.codes as code (`${objective.id}-${code}`)}
          {@const npc = getNpc(objective, code)}
          {#if npc}
            <a
              href={`/npcs/${npc.id}`}
              data-sveltekit-reload
              class="unstyled flex items-center gap-3 rounded p-2 transition-colors hover:bg-surface-600"
            >
              <NpcImage name={npc.name} portrait={npc.portrait} />
              <p class="font-semibold">{npc.name}</p>
            </a>
          {:else}
            <p>{getObjectiveLabel(objective.condition_type)}: {code}</p>
          {/if}
        {/each}
      {:else}
        <p>{getObjectiveLabel(objective.condition_type)}: {objective.required_value}</p>
      {/if}
    {/each}
  </div>
</div>
