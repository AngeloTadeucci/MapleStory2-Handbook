<script lang="ts">
  import CopyId from '$lib/components/CopyId.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import type { Quest } from '$lib/types/Quest';
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import Link from '$lib/components/Link.svelte';
  import { closeMissingTags, unescapeHtml } from '$lib/helpers/htmlParser';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import Rewards from '$lib/components/quest/Rewards.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const quest = data.props.quest as unknown as Quest;

  async function incrementViewCount() {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      await fetch(`/api/quests?id=${quest.id}`, {
        method: 'POST'
      });
    } catch {}
  }

  onMount(async () => {
    if (!quest) {
      return;
    }

    incrementViewCount();
  });
</script>

<svelte:head>
  <title>MS2 Handbook - {quest.name}</title>
  <!-- Open graph -->
  <meta property="og:title" content={quest.name} />
  <meta property="og:description" content={quest.name} />
  <meta property="og:url" content={url(`/quests/${quest.id}`)} />
</svelte:head>

<div class="mt-5 grid justify-center">
  <div class="ml-4 flex items-center gap-1">
    <a href="/quests" class="unstyled underline">Quests</a>
    &gt;
    <CopyId id={quest.id} />
  </div>
  <div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
    <div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row">
      <ItemListContainer classname="relative">
        <img
          src={url('/quest/quest_epic.png')}
          class="absolute w-[63px] h-[88px] -top-[10px]"
          alt="Epic quest"
        />
        <h1 class="text-center z-10 l">{quest.name}</h1>
        <div class="relative flex items-center justify-center">
          <hr id="splitline" />
          <p class="absolute">Lv. {quest.requiredLevel}</p>
        </div>
        {#if quest.requiredQuest.length > 0}
          {#each quest.requiredQuest as reqQuest}
            <p>
              You must complete "<Link href={`/quests/${reqQuest.Id}`}>{reqQuest.Name}</Link>" to
              begin this quest
            </p>
          {/each}
        {/if}

        {#if quest.selectableQuest.length > 0}
          <p>You must have at least one of the following quests to being this quest:</p>
          <ul class="ml-1">
            {#each quest.selectableQuest as selecQuest}
              <li class="mt-1"><Link href={`/quests/${selecQuest.Id}`}>{selecQuest.Name}</Link></li>
            {/each}
          </ul>
        {/if}
        {#if quest.requiredQuest.length > 0 || quest.selectableQuest.length > 0}
          <hr id="splitline" />
        {/if}
        {#if quest.startNpcId > 0}
          <p>
            This quest is started by{' '}
            <Link href={`/npcs/${quest.startNpcId}`}>{quest.startNpcName}</Link>
          </p>
        {/if}
        {#if quest.completeNpcId > 0}
          <p>
            This quest is completed by{' '}
            <Link href={`/npcs/${quest.completeNpcId}`}>{quest.completeNpcName}</Link>
          </p>
        {/if}
        <hr id="splitline" />
        <p>{@html closeMissingTags(unescapeHtml(quest.description))}</p>
        {#if quest.manualDescription}
          <p>{@html closeMissingTags(unescapeHtml(quest.manualDescription), true)}</p>
        {/if}
        {#if quest.completeDescription}
          <p>{@html closeMissingTags(unescapeHtml(quest.completeDescription), true)}</p>
        {/if}
        <hr id="splitline" />
        {#if quest.startRewards}
          <Rewards reward={quest.startRewards} text="Start Rewards" />
        {/if}

        {#if quest.completeRewards}
          <Rewards reward={quest.completeRewards} text="Complete Rewards" />
        {/if}
      </ItemListContainer>
    </div>
  </div>
</div>

<style lang="scss">
  ul {
    list-style-type: disc;
    list-style-position: inside;
  }

  hr#splitline {
    background-image: url('/quest/quest_divider.png');
    background-repeat: no-repeat;
    margin: 0;
    width: 421px;
    height: 11px;
    border: none;

    margin: auto;
    margin-top: 1rem;
    margin-bottom: 1rem;

    // invert image colors
    /* filter: invert(1); */
  }
</style>
