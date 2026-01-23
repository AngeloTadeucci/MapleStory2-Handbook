<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import CopyId from '$lib/components/CopyId.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import ComboboxChips from '$lib/components/ComboboxChips.svelte';
  import RangeSlider from '$lib/components/RangeSlider.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import type { SearchQuest } from '$lib/types/Quest';
  import { questTypeToWhitelist, getQuestTypeByDisplayName } from '$lib/types/Quest';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';

  let searchTerm = $state('');

  let data: SearchQuest[][] = $state([]);
  let loading = $state(true);

  // Pagination state for Skeleton v4 (1-indexed)
  let currentPage = $state(1);
  let pageSize = $state(10);
  let totalItems = $state(0);
  const pageSizeOptions = [10, 25, 50, 100, 200];

  // Filter state
  let questTypeList: string[] = $state([]);
  let questLevelRange = $state<number[]>([0, 99]);
  let requiredLevelRange = $state<number[]>([0, 99]);
  let hasPrerequisitesOnly = $state(false);

  async function fetchData(clearCache: boolean) {
    let lastSearchTerm = searchTerm;

    // Skeleton v4 uses 1-indexed pages, data array is 0-indexed
    const dataIndex = currentPage - 1;

    // check if we have the data cached
    if (data[dataIndex] && !clearCache) {
      return;
    }

    const params = paramsBuilder([
      {
        name: 'search',
        value: searchTerm
      },
      {
        name: 'page',
        value: currentPage - 1  // API expects 0-indexed
      },
      {
        name: 'limit',
        value: pageSize
      },
      {
        name: 'questType',
        value: questTypeList.map((x) => getQuestTypeByDisplayName(x)).filter((x) => x !== undefined).join(',')
      },
      {
        name: 'minQuestLevel',
        value: questLevelRange[0] === 0 ? null : questLevelRange[0]
      },
      {
        name: 'maxQuestLevel',
        value: questLevelRange[1] === 99 ? null : questLevelRange[1]
      },
      {
        name: 'minRequiredLevel',
        value: requiredLevelRange[0] === 0 ? null : requiredLevelRange[0]
      },
      {
        name: 'maxRequiredLevel',
        value: requiredLevelRange[1] === 99 ? null : requiredLevelRange[1]
      },
      {
        name: 'hasPrerequisites',
        value: hasPrerequisitesOnly ? 'true' : null
      }
    ]);

    loading = true;
    const response = await fetch(url(`/api/quests${params}`));

    const responseJson = await response.json();
    const quests = responseJson.quests as SearchQuest[];
    const total = responseJson.total as number;

    if (quests.length === 0) {
      data = [];
      totalItems = total;
      loading = false;
      return;
    }

    if (lastSearchTerm !== searchTerm || clearCache) {
      data = [];
    }

    // Svelte 5 reactivity: need to reassign the array, not just mutate index
    const newData = [...data];
    newData[dataIndex] = quests;
    data = newData;

    lastSearchTerm = searchTerm;
    totalItems = total;

    // Adjust pageSize if needed
    const amounts = pageSizeOptions.filter((amount) => amount <= total);
    if (amounts.length === 0 && total > 0) {
      pageSize = total;
      $page.url.searchParams.set('limit', total.toString());
      goto($page.url.href, { keepFocus: true, replaceState: true });
    }
    if (pageSize < amounts[0] && amounts.length > 0) {
      pageSize = amounts[0];
      $page.url.searchParams.set('limit', amounts[0].toString());
      goto($page.url.href, { keepFocus: true, replaceState: true });
    }

    loading = false;
  }

  onMount(() => {
    // Initialize all state from URL params
    searchTerm = $page.url.searchParams.get('search') || '';

    const urlPage = $page.url.searchParams.get('page');
    currentPage = urlPage ? parseInt(urlPage) + 1 : 1;
    pageSize = $page.url.searchParams.get('limit')
      ? parseInt($page.url.searchParams.get('limit')!)
      : 10;

    const questType = $page.url.searchParams.get('questType');
    if (questType) {
      questTypeList = questType.split(',').map((x) => {
        const num = parseInt(x);
        return questTypeToWhitelist()[num];
      }).filter((x) => x !== undefined);
    }

    const minQuestLevel = $page.url.searchParams.get('minQuestLevel');
    const maxQuestLevel = $page.url.searchParams.get('maxQuestLevel');
    questLevelRange = [
      minQuestLevel ? parseInt(minQuestLevel) : 0,
      maxQuestLevel ? parseInt(maxQuestLevel) : 99
    ];

    const minRequiredLevel = $page.url.searchParams.get('minRequiredLevel');
    const maxRequiredLevel = $page.url.searchParams.get('maxRequiredLevel');
    requiredLevelRange = [
      minRequiredLevel ? parseInt(minRequiredLevel) : 0,
      maxRequiredLevel ? parseInt(maxRequiredLevel) : 99
    ];

    hasPrerequisitesOnly = $page.url.searchParams.get('hasPrerequisites') === 'true';

    // load first batch onMount
    fetchData(false);
  });

  let paginatedSource = $derived(data[currentPage - 1] || []);

  function onPageChange(newPage: number): void {
    currentPage = newPage;
    // Store 0-indexed in URL for API compatibility
    $page.url.searchParams.set('page', String(newPage - 1));
    goto($page.url.href, { keepFocus: true, replaceState: true });
    fetchData(false);
  }

  function onPageSizeChange(newSize: number): void {
    pageSize = newSize;
    currentPage = 1;
    $page.url.searchParams.set('limit', String(newSize));
    $page.url.searchParams.set('page', '0');
    goto($page.url.href, { keepFocus: true, replaceState: true });
    data = [];
    fetchData(true);
  }

  function updateQuestTypeParams() {
    if (questTypeList.length === 0) {
      $page.url.searchParams.delete('questType');
    } else {
      $page.url.searchParams.set(
        'questType',
        questTypeList.map((x) => getQuestTypeByDisplayName(x)).filter((x) => x !== undefined).join(',')
      );
    }
  }

  const debouncedSearch = debounce(
    async () => {
      $page.url.searchParams.set('search', searchTerm);

      currentPage = 1;
      $page.url.searchParams.set('page', '0');

      pageSize = 10;
      $page.url.searchParams.set('limit', '10');

      goto($page.url.href, { keepFocus: true, replaceState: true });
      await fetchData(true);
    },
    500,
    {
      maxWait: 1000
    }
  );

  const debouncedQuestLevelChange = debounce(
    async (prevRange: number[], newRange: number[]) => {
      if (prevRange[0] !== newRange[0] || prevRange[1] !== newRange[1]) {
        if (newRange[0] !== 0) {
          $page.url.searchParams.set('minQuestLevel', newRange[0].toString());
        } else {
          $page.url.searchParams.delete('minQuestLevel');
        }

        if (newRange[1] !== 99) {
          $page.url.searchParams.set('maxQuestLevel', newRange[1].toString());
        } else {
          $page.url.searchParams.delete('maxQuestLevel');
        }

        currentPage = 1;
        $page.url.searchParams.set('page', '0');

        goto($page.url.href, { keepFocus: true, replaceState: true });
        await fetchData(true);
      }
    },
    300,
    {
      maxWait: 1000
    }
  );

  function handleQuestLevelChange(details: { value: number[] }) {
    const prevRange = [...questLevelRange];
    questLevelRange = details.value;
    debouncedQuestLevelChange(prevRange, details.value);
  }

  const debouncedRequiredLevelChange = debounce(
    async (prevRange: number[], newRange: number[]) => {
      if (prevRange[0] !== newRange[0] || prevRange[1] !== newRange[1]) {
        if (newRange[0] !== 0) {
          $page.url.searchParams.set('minRequiredLevel', newRange[0].toString());
        } else {
          $page.url.searchParams.delete('minRequiredLevel');
        }

        if (newRange[1] !== 99) {
          $page.url.searchParams.set('maxRequiredLevel', newRange[1].toString());
        } else {
          $page.url.searchParams.delete('maxRequiredLevel');
        }

        currentPage = 1;
        $page.url.searchParams.set('page', '0');

        goto($page.url.href, { keepFocus: true, replaceState: true });
        await fetchData(true);
      }
    },
    300,
    {
      maxWait: 1000
    }
  );

  function handleRequiredLevelChange(details: { value: number[] }) {
    const prevRange = [...requiredLevelRange];
    requiredLevelRange = details.value;
    debouncedRequiredLevelChange(prevRange, details.value);
  }
</script>

<svelte:head>
  <title>MS2 Handbook - Quests</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Quests</h1>
  <div class="mb-4 flex items-center justify-between">
    <input
      type="text"
      placeholder="Search 🔎"
      class="input w-1/2 px-4 py-2 lg:w-1/3 bg-surface-700 text-surface-50 border-transparent placeholder:text-surface-400"
      bind:value={searchTerm}
      onkeyup={debouncedSearch}
    />
    <div>
      <label class="label flex items-center justify-center gap-4 cursor-pointer">
        <span>Clear filters</span>
        <button
          type="button"
          class="btn-icon btn-icon-sm preset-filled flex items-center justify-center"
          onclick={async () => {
            $page.url.searchParams.delete('questType');
            $page.url.searchParams.delete('minQuestLevel');
            $page.url.searchParams.delete('maxQuestLevel');
            $page.url.searchParams.delete('minRequiredLevel');
            $page.url.searchParams.delete('maxRequiredLevel');
            $page.url.searchParams.delete('hasPrerequisites');
            $page.url.searchParams.delete('search');
            $page.url.searchParams.delete('page');
            $page.url.searchParams.delete('limit');

            questTypeList = [];
            questLevelRange = [0, 99];
            requiredLevelRange = [0, 99];
            hasPrerequisitesOnly = false;

            currentPage = 1;
            pageSize = 10;
            searchTerm = '';

            goto($page.url.href, { keepFocus: true, replaceState: true });
            await fetchData(true);
          }}
        >
          <img src={url('/icons/filter_alt_off.svg')} width="24" alt="Clear filters" />
        </button>
      </label>
    </div>
  </div>
  <div class="flex flex-col gap-3 lg:flex-row">
    <label class="label w-full lg:w-1/3">
      <span>Filter by quest type</span>
      <ComboboxChips
        name="questType"
        bind:value={questTypeList}
        whitelist={questTypeToWhitelist()}
        placeholder="Select quest type..."
        onValueChange={async () => {
          updateQuestTypeParams();
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <div class="w-full lg:w-1/3">
      <RangeSlider
        label="Quest Level Range"
        min={0}
        max={99}
        value={questLevelRange}
        onValueChange={handleQuestLevelChange}
      />
    </div>
    <div class="w-full lg:w-1/3">
      <RangeSlider
        label="Required Level Range"
        min={0}
        max={99}
        value={requiredLevelRange}
        onValueChange={handleRequiredLevelChange}
      />
    </div>
  </div>
  <div class="flex flex-col gap-3 lg:flex-row mt-3">
    <label class="flex items-center space-x-2 w-full lg:w-auto">
      <input
        class="checkbox bg-surface-700 border-surface-500 checked:bg-primary-500 checked:border-primary-500"
        type="checkbox"
        bind:checked={hasPrerequisitesOnly}
        onchange={async () => {
          if (hasPrerequisitesOnly) {
            $page.url.searchParams.set('hasPrerequisites', 'true');
          } else {
            $page.url.searchParams.delete('hasPrerequisites');
          }
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
      <span>Has prerequisites</span>
    </label>
  </div>

  {#if totalItems > 0}
    <PaginationWrapper
      count={totalItems}
      {pageSize}
      page={currentPage}
      pageSizeOptions={pageSizeOptions.filter(opt => opt <= totalItems || totalItems === 0)}
      {onPageChange}
      {onPageSizeChange}
      class="mt-5"
    />
  {/if}

  <div class="flex flex-row border-b border-gray2">
    <div class="py-4 pr-6 text-left w-1/3">Id</div>
    <div class="py-4 pr-6 text-left w-2/3">Name</div>
  </div>
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <LoadingSpinner />
    </div>
  {/if}
  {#if paginatedSource && paginatedSource.length === 0 && !loading}
    <div class="flex items-center justify-center">
      <h2 class="my-10">No items found</h2>
    </div>
  {/if}
  {#each paginatedSource as quest}
    <a
      class="unstyled flex py-4 items-center border-b border-gray2 last:border-none hover:preset-tonal transition-colors"
      href={url(`/quests/${quest.id}`)}
    >
      <div class="w-1/3">
        <CopyId id={quest.id} />
      </div>
      <div class="text-left w-2/3">{quest.name}</div>
    </a>
  {/each}
  {#if totalItems > 0}
    <PaginationWrapper
      count={totalItems}
      {pageSize}
      page={currentPage}
      pageSizeOptions={pageSizeOptions.filter(opt => opt <= totalItems || totalItems === 0)}
      {onPageChange}
      {onPageSizeChange}
      class="mt-5"
    />
  {/if}
</div>
