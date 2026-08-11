<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import { getQuestTypeName } from '$lib/types/Quest';
  import type { ChainNode } from '$lib/types/QuestChain';

  interface Props {
    nodes: ChainNode[];
    selectedId: number | null;
    selectHref: (questId: number) => string;
  }

  let { nodes, selectedId, selectHref }: Props = $props();

  const ROLE_LABELS: Record<ChainNode['role'], string> = {
    in: 'In chain',
    up: 'Prerequisite',
    down: 'Unlocked later'
  };
  const ROLE_ORDER: Record<ChainNode['role'], number> = { up: 0, in: 1, down: 2 };

  const names = $derived(new Map(nodes.map((node) => [node.id, node.name])));

  const rows = $derived(
    [...nodes].sort((a, b) => {
      if (a.role !== b.role) return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
      if (a.questLevel !== b.questLevel) return a.questLevel - b.questLevel;
      return a.id - b.id;
    })
  );

  function label(id: number): string {
    return names.get(id) ?? String(id);
  }
</script>

<div class="overflow-x-auto rounded-xl bg-surface-800">
  <table class="w-full text-left text-sm">
    <thead class="border-b border-surface-600 text-surface-200">
      <tr>
        <th class="px-4 py-3 font-semibold">Quest</th>
        <th class="px-4 py-3 font-semibold">Id</th>
        <th class="px-4 py-3 font-semibold">Chapter</th>
        <th class="px-4 py-3 font-semibold">Type</th>
        <th class="px-4 py-3 font-semibold">Level</th>
        <th class="px-4 py-3 font-semibold">Requires</th>
        <th class="px-4 py-3 font-semibold">Unlocks</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as quest (quest.id)}
        <tr
          class="border-b border-surface-700 align-top last:border-none hover:bg-surface-700"
          class:bg-surface-700={quest.id === selectedId}
        >
          <td class="px-4 py-3">
            <a class="anchor font-medium" href={`/quests/${quest.id}`}>{quest.name}</a>
            <div class="mt-1 flex items-center gap-2 text-xs text-surface-300">
              <span
                class="role-pill"
                class:role-in={quest.role === 'in'}
                class:role-up={quest.role === 'up'}
                class:role-down={quest.role === 'down'}>{ROLE_LABELS[quest.role]}</span
              >
              <a class="anchor" href={selectHref(quest.id)} data-sveltekit-noscroll>Details</a>
            </div>
          </td>
          <td class="px-4 py-3"><CopyId id={quest.id} /></td>
          <td class="px-4 py-3">
            {#if quest.chapterId !== null}
              <a class="anchor" href={`/quests/chains?chapter=${quest.chapterId}`}>
                {quest.chapterName ?? `Chapter ${quest.chapterId}`}
              </a>
            {:else}
              <span class="text-surface-400">None</span>
            {/if}
          </td>
          <td class="px-4 py-3">{getQuestTypeName(quest.questType)}</td>
          <td class="px-4 py-3">{quest.questLevel || '?'}</td>
          <td class="px-4 py-3">
            {#if quest.requires.length === 0 && quest.selectable.length === 0}
              <span class="text-surface-400">Nothing</span>
            {:else}
              <ul class="space-y-1">
                {#each quest.requires as id (id)}
                  <li><a class="anchor" href={`/quests/${id}`}>{label(id)}</a></li>
                {/each}
                {#each quest.selectable as id (id)}
                  <li>
                    <a class="anchor" href={`/quests/${id}`}>{label(id)}</a>
                    <span class="text-xs text-surface-400">(any one of)</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </td>
          <td class="px-4 py-3">
            {#if quest.unlocks.length === 0}
              <span class="text-surface-400">Nothing</span>
            {:else}
              <ul class="space-y-1">
                {#each quest.unlocks as id (id)}
                  <li><a class="anchor" href={`/quests/${id}`}>{label(id)}</a></li>
                {/each}
              </ul>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .role-pill {
    border-radius: 9999px;
    border: 1px solid;
    padding: 0 0.5rem;
    font-size: 0.7rem;
    line-height: 1.25rem;
  }
  .role-in {
    border-color: var(--color-primary-500);
    color: var(--color-primary-300);
  }
  .role-up {
    border-color: var(--color-warning-500);
    color: var(--color-warning-300);
  }
  .role-down {
    border-color: var(--color-success-500);
    color: var(--color-success-300);
  }
</style>
