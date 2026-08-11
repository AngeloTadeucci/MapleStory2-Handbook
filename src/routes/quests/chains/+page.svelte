<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ComboboxChips from '$lib/components/ComboboxChips.svelte';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import RangeSlider from '$lib/components/RangeSlider.svelte';
  import ChainDetail from '$lib/components/quest/ChainDetail.svelte';
  import ChainGraph from '$lib/components/quest/ChainGraph.svelte';
  import ChainTable from '$lib/components/quest/ChainTable.svelte';
  import { getQuestTypeByDisplayName, questTypeToWhitelist } from '$lib/types/Quest';
  import {
    chapterCategoryToWhitelist,
    getChapterCategoryByDisplayName,
    getChapterCategoryName
  } from '$lib/types/QuestChain';
  import debounce from 'lodash.debounce';
  import { ArrowLeft, Network, Table2 } from 'lucide-svelte';
  import { untrack } from 'svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const LEVEL_MIN = 0;
  const LEVEL_MAX = 99;

  function categoryLabels(): string[] {
    return data.filters.categories.map(getChapterCategoryName);
  }

  function questTypeLabels(): string[] {
    return data.filters.questTypes.map((type) => questTypeToWhitelist()[type]).filter(Boolean);
  }

  // The URL is the source of truth. These mirror it so the inputs stay
  // controlled, and the effect below re-syncs them whenever a load brings
  // different filters in, which is what makes the back button work. The
  // initialisers deliberately read the first value only, hence untrack.
  let searchTerm = $state(untrack(() => data.filters.search));
  let categoryList = $state(untrack(categoryLabels));
  let questTypeList = $state(untrack(questTypeLabels));
  let levelRange = $state(untrack(() => data.filters.levelRange));

  $effect(() => {
    searchTerm = data.filters.search;
    categoryList = categoryLabels();
    questTypeList = questTypeLabels();
    levelRange = data.filters.levelRange;
  });

  function buildHref(changes: Record<string, string | null>): string {
    const url = new URL($page.url);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}`;
  }

  async function apply(changes: Record<string, string | null>) {
    await goto(buildHref(changes), { keepFocus: true, noScroll: true });
  }

  const debouncedSearch = debounce(() => apply({ search: searchTerm || null, page: null }), 500, {
    maxWait: 1000
  });

  const debouncedLevel = debounce(
    (range: number[]) =>
      apply({
        minLevel: range[0] === LEVEL_MIN ? null : String(range[0]),
        maxLevel: range[1] === LEVEL_MAX ? null : String(range[1]),
        page: null
      }),
    300,
    { maxWait: 1000 }
  );

  function onLevelChange(details: { value: number[] }) {
    levelRange = details.value;
    debouncedLevel(details.value);
  }

  function clearFilters() {
    apply({
      search: null,
      category: null,
      questType: null,
      minLevel: null,
      maxLevel: null,
      page: null,
      limit: null
    });
  }

  // In a chain view the quest in the URL doubles as the root the walk starts
  // from, so selecting one would rebuild the graph around it and everything
  // would shift under the cursor. Pin the root the moment anything is selected.
  // "Nearby chain" in the details panel stays the deliberate way to re-root.
  const selectHref = (questId: number) =>
    data.mode === 'line' && data.root
      ? buildHref({ root: String(data.root.id), quest: String(questId) })
      : buildHref({ quest: String(questId) });

  const scopeNodes = $derived(data.scope?.nodes ?? []);
  const tooBigForGraph = $derived(scopeNodes.length > data.limits.maxGraphNodes);
  const showGraph = $derived(data.view === 'graph' && !tooBigForGraph);

  // Which chapter the graph draws brighter than the rest: the one the view is
  // about, which is the chapter itself in a chapter view and the chapter of the
  // quest the walk starts from in a chain view. Following the selection instead
  // would repaint the background on every click.
  const currentChapterId = $derived(
    data.mode === 'chapter' ? data.chapterId : (data.root?.chapterId ?? null)
  );

  const heading = $derived.by(() => {
    if (data.mode === 'chapter') return data.chapter?.name ?? `Chapter ${data.chapterId}`;
    if (data.mode === 'line') return data.root ? `Chain around ${data.root.name}` : 'Quest chain';
    return 'Quest Chains';
  });
</script>

<svelte:head>
  <title>MS2 Handbook - Quest Chains</title>
  <meta
    name="description"
    content="Browse MapleStory 2 quest chapters and see how their quests unlock each other."
  />
</svelte:head>

<div class="mt-8 h-px"></div>
<div
  class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto {data.mode === 'browse'
    ? 'lg:w-3/4'
    : 'lg:w-11/12'}"
>
  {#if data.mode === 'browse'}
    <h1 class="mb-2 text-4xl font-bold">Quest Chains</h1>
    <p class="mb-4 text-surface-200">
      Quests are grouped into chapters, and within a chapter each quest unlocks the next. Pick a
      chapter to see how its quests connect. {data.stats.chapterCount.toLocaleString()} chapters cover
      {data.stats.questCount.toLocaleString()} quests.
    </p>

    <div class="mb-4 flex items-center justify-between gap-4">
      <input
        type="text"
        placeholder="Search chapters and quests 🔎"
        class="input w-full border-transparent bg-surface-700 px-4 py-2 text-surface-50 placeholder:text-surface-400 lg:w-1/2"
        bind:value={searchTerm}
        onkeyup={debouncedSearch}
      />
      <button
        type="button"
        class="btn preset-tonal shrink-0"
        onclick={clearFilters}
        aria-label="Clear filters"
      >
        Clear filters
      </button>
    </div>

    <div class="flex flex-col gap-3 lg:flex-row">
      <label class="label w-full lg:w-1/3">
        <span>Filter by chapter category</span>
        <ComboboxChips
          name="category"
          bind:value={categoryList}
          whitelist={chapterCategoryToWhitelist()}
          placeholder="Select category..."
          onValueChange={() => {
            const raw = categoryList
              .map((label) => getChapterCategoryByDisplayName(label))
              .filter((value) => value !== undefined);
            apply({ category: raw.length > 0 ? raw.join(',') : null, page: null });
          }}
        />
      </label>
      <label class="label w-full lg:w-1/3">
        <span>Filter by quest type</span>
        <ComboboxChips
          name="questType"
          bind:value={questTypeList}
          whitelist={questTypeToWhitelist()}
          placeholder="Select quest type..."
          onValueChange={() => {
            const raw = questTypeList
              .map((label) => getQuestTypeByDisplayName(label))
              .filter((value) => value !== undefined);
            apply({ questType: raw.length > 0 ? raw.join(',') : null, page: null });
          }}
        />
      </label>
      <div class="w-full lg:w-1/3">
        <RangeSlider
          label="Quest Level Range"
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          value={levelRange}
          onValueChange={onLevelChange}
        />
      </div>
    </div>

    {#if data.total > 0}
      <PaginationWrapper
        count={data.total}
        pageSize={data.pageSize}
        page={data.page}
        pageSizeOptions={data.pageSizeOptions.filter((opt) => opt <= data.total)}
        onPageChange={(newPage) => apply({ page: String(newPage - 1) })}
        onPageSizeChange={(size) => apply({ limit: String(size), page: null })}
        class="mt-5"
      />
    {/if}

    <div class="mt-4 flex flex-row border-b border-gray2 text-surface-200">
      <div class="w-1/2 py-3 pr-4 text-left">Chapter</div>
      <div class="w-1/4 py-3 pr-4 text-left">Category</div>
      <div class="w-[12.5%] py-3 pr-4 text-right">Quests</div>
      <div class="w-[12.5%] py-3 text-right">Levels</div>
    </div>

    {#if data.chapters.length === 0}
      <div class="flex items-center justify-center">
        <h2 class="my-10">No chapters found</h2>
      </div>
    {/if}

    {#each data.chapters as chapter (chapter.id)}
      <a
        class="unstyled flex flex-row items-center border-b border-gray2 py-3 transition-colors last:border-none hover:preset-tonal"
        href={`/quests/chains?chapter=${chapter.id}`}
      >
        <div class="w-1/2 pr-4">
          <span class="font-medium">{chapter.name}</span>
          <span class="ml-2 text-xs text-surface-400">#{chapter.id}</span>
        </div>
        <div class="w-1/4 pr-4 text-surface-200">{chapter.categoryLabel}</div>
        <div class="w-[12.5%] pr-4 text-right">{chapter.questCount}</div>
        <div class="w-[12.5%] text-right text-surface-200">
          {#if chapter.minLevel === null || chapter.maxLevel === null}
            <span class="text-surface-400">?</span>
          {:else if chapter.minLevel === chapter.maxLevel}
            {chapter.minLevel}
          {:else}
            {chapter.minLevel}–{chapter.maxLevel}
          {/if}
        </div>
      </a>
    {/each}

    {#if data.total > 0}
      <PaginationWrapper
        count={data.total}
        pageSize={data.pageSize}
        page={data.page}
        pageSizeOptions={data.pageSizeOptions.filter((opt) => opt <= data.total)}
        onPageChange={(newPage) => apply({ page: String(newPage - 1) })}
        onPageSizeChange={(size) => apply({ limit: String(size), page: null })}
        class="mt-5"
      />
    {/if}
  {:else}
    <a class="anchor mb-3 inline-flex items-center gap-2" href="/quests/chains">
      <ArrowLeft size={16} /> All chapters
    </a>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">{heading}</h1>
        <p class="mt-1 text-sm text-surface-300">
          {#if data.mode === 'chapter' && data.chapter}
            {data.chapter.categoryLabel} chapter #{data.chapter.id} ·
            {data.scope?.coreCount ?? 0} quests
            {#if data.chapter.minLevel !== null && data.chapter.maxLevel !== null}
              · levels {data.chapter.minLevel}–{data.chapter.maxLevel}
            {/if}
          {:else if data.mode === 'line'}
            Quests within {data.limits.maxChainHops} steps of this one, across chapter boundaries ·
            {data.scope?.coreCount ?? 0} quests
          {/if}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <a
          class="btn btn-sm {data.view === 'graph' ? 'preset-filled-primary-500' : 'preset-tonal'}"
          href={buildHref({ view: null })}
          data-sveltekit-noscroll
        >
          <Network size={16} /> Graph
        </a>
        <a
          class="btn btn-sm {data.view === 'table' ? 'preset-filled-primary-500' : 'preset-tonal'}"
          href={buildHref({ view: 'table' })}
          data-sveltekit-noscroll
        >
          <Table2 size={16} /> Table
        </a>
      </div>
    </div>

    {#if data.scope && data.scope.omittedCount > 0}
      <p class="mb-4 rounded-lg bg-surface-700 px-4 py-3 text-sm text-surface-100">
        {#if data.mode === 'line'}
          The chain carries on past this view: {data.scope.omittedCount.toLocaleString()} further quests
          connect to it, more than {data.limits.maxChainHops} steps away. Open a quest at the edge to
          keep following it.
        {:else}
          This chapter is larger than one view can hold, so {data.scope.omittedCount.toLocaleString()}
          further quests are not shown. Open a quest to follow the chain from there.
        {/if}
      </p>
    {/if}

    {#if tooBigForGraph && data.view === 'graph'}
      <p class="mb-4 rounded-lg bg-surface-700 px-4 py-3 text-sm text-surface-100">
        This chain has {scopeNodes.length.toLocaleString()} quests, too many to draw legibly, so the table
        is shown instead. Open a single quest to see its own chain as a graph.
      </p>
    {/if}

    {#if !data.scope || scopeNodes.length === 0}
      <div class="flex items-center justify-center">
        <h2 class="my-10">Nothing to show for this chapter</h2>
      </div>
    {:else}
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div class="min-w-0 flex-1">
          {#if showGraph}
            <ChainGraph
              nodes={scopeNodes}
              edges={data.scope.edges}
              selectedId={data.selected?.id ?? null}
              {currentChapterId}
              chapterTones={data.chapterTones}
              {selectHref}
            />
          {:else}
            <ChainTable nodes={scopeNodes} selectedId={data.selected?.id ?? null} {selectHref} />
          {/if}
        </div>
        <!-- The column is held open on wide screens even with nothing selected.
             The graph wraps its rows to the width it is given, so a panel that
             only appeared on click would narrow that width and re-lay every
             quest out from under the pointer. Narrow screens stack instead, so
             there the empty column is dropped rather than left blank. -->
        <div class="w-full xl:w-96 xl:shrink-0 {data.selected ? '' : 'hidden xl:block'}">
          {#if data.selected}
            <ChainDetail
              quest={data.selected}
              closeHref={buildHref({ quest: null })}
              lineHref={`/quests/chains?quest=${data.selected.id}&line=1`}
            />
          {:else}
            <p
              class="rounded-lg border border-dashed border-surface-600 px-4 py-6 text-center text-sm text-surface-400"
            >
              Click a quest to see its details here.
            </p>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
