<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import { getQuestTypeName } from '$lib/types/Quest';
  import type { ChainQuestDetail } from '$lib/types/QuestChain';
  import { ExternalLink, X } from 'lucide-svelte';

  interface Props {
    quest: ChainQuestDetail;
    /** URL that clears the selection but keeps the current scope. */
    closeHref: string;
    /** URL that re-centres the chain view on this quest. */
    lineHref: string;
  }

  let { quest, closeHref, lineHref }: Props = $props();
</script>

<aside class="rounded-xl bg-surface-800 p-4">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h2 class="text-xl font-semibold">{quest.name}</h2>
      <p class="mt-1 text-sm text-surface-300">
        Lv {quest.questLevel || '?'} · {getQuestTypeName(quest.questType)}
        {#if quest.requiredLevel > 0}
          · needs character level {quest.requiredLevel}
        {/if}
      </p>
    </div>
    <a
      href={closeHref}
      class="btn-icon btn-icon-sm preset-tonal"
      aria-label="Close quest details"
      data-sveltekit-noscroll
    >
      <X size={16} />
    </a>
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-2">
    <CopyId id={quest.id} />
    <a class="btn btn-sm preset-tonal" href={`/quests/${quest.id}`}>
      <ExternalLink size={14} /> Quest page
    </a>
    <a class="btn btn-sm preset-tonal" href={lineHref}>Nearby chain</a>
  </div>

  <dl class="mt-4 space-y-3 text-sm">
    <div>
      <dt class="text-surface-300">Chapter</dt>
      <dd>
        {#if quest.chapterId !== null}
          <a class="anchor" href={`/quests/chains?chapter=${quest.chapterId}`}>
            {quest.chapterName ?? `Chapter ${quest.chapterId}`}
          </a>
        {:else}
          <span class="text-surface-400">Not part of a chapter</span>
        {/if}
      </dd>
    </div>

    {#if quest.startNpcId > 0 || quest.completeNpcId > 0}
      <div>
        <dt class="text-surface-300">NPCs</dt>
        <dd class="space-y-1">
          {#if quest.startNpcId > 0}
            <div>
              Starts at <a class="anchor" href={`/npcs/${quest.startNpcId}`}
                >{quest.startNpcName ?? quest.startNpcId}</a
              >
            </div>
          {/if}
          {#if quest.completeNpcId > 0}
            <div>
              Ends at <a class="anchor" href={`/npcs/${quest.completeNpcId}`}
                >{quest.completeNpcName ?? quest.completeNpcId}</a
              >
            </div>
          {/if}
        </dd>
      </div>
    {/if}

    <div>
      <dt class="text-surface-300">Requires</dt>
      <dd>
        {#if quest.requiredQuests.length === 0 && quest.selectableQuests.length === 0}
          <span class="text-surface-400">Nothing, this quest can start a chain</span>
        {:else}
          <ul class="space-y-1">
            {#each quest.requiredQuests as prereq (prereq.id)}
              <li><a class="anchor" href={`/quests/${prereq.id}`}>{prereq.name}</a></li>
            {/each}
            {#if quest.selectableQuests.length > 0}
              <li class="pt-1 text-surface-300">Any one of:</li>
              {#each quest.selectableQuests as prereq (prereq.id)}
                <li class="ml-3">
                  <a class="anchor" href={`/quests/${prereq.id}`}>{prereq.name}</a>
                </li>
              {/each}
            {/if}
          </ul>
        {/if}
      </dd>
    </div>

    <div>
      <dt class="text-surface-300">Unlocks</dt>
      <dd>
        {#if quest.unlockedQuests.length === 0}
          <span class="text-surface-400">Nothing, this quest ends its chain</span>
        {:else}
          <ul class="space-y-1">
            {#each quest.unlockedQuests as next (next.id)}
              <li><a class="anchor" href={`/quests/${next.id}`}>{next.name}</a></li>
            {/each}
          </ul>
        {/if}
      </dd>
    </div>
  </dl>
</aside>
