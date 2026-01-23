<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import CopyId from '$lib/components/CopyId.svelte';
  import NpcImage from '$lib/components/npc/NpcImage.svelte';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import RangeSlider from '$lib/components/RangeSlider.svelte';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import type { SearchNpc } from '$lib/types/Npc';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ComboboxChips from '$lib/components/ComboboxChips.svelte';
  import { NpcType, enumToWhitelist } from '$lib/Enums';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';

  let searchTerm = $state('');

  let data: SearchNpc[][] = $state([]);
  let loading = $state(true);

  // Pagination state for Skeleton v4 (1-indexed)
  let currentPage = $state(1);
  let pageSize = $state(10);
  let totalItems = $state(0);
  const pageSizeOptions = [10, 25, 50, 100, 200];

  // Filter state
  let npcTypeList: string[] = $state([]);
  let levelRange = $state<number[]>([0, 99]);
  let isBossOnly = $state(false);
  let hasShopOnly = $state(false);

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
        name: 'npcType',
        value: npcTypeList.map((x) => NpcType[x as keyof typeof NpcType]).join(',')
      },
      {
        name: 'minLevel',
        value: levelRange[0] === 0 ? null : levelRange[0]
      },
      {
        name: 'maxLevel',
        value: levelRange[1] === 99 ? null : levelRange[1]
      },
      {
        name: 'isBoss',
        value: isBossOnly ? 'true' : null
      },
      {
        name: 'hasShop',
        value: hasShopOnly ? 'true' : null
      }
    ]);

    loading = true;
    const response = await fetch(`/api/npcs${params}`);

    const responseJson = await response.json();
    const npcs = responseJson.npcs as SearchNpc[];
    const total = responseJson.total as number;

    if (npcs.length === 0) {
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
    newData[dataIndex] = npcs;
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

    const npcType = $page.url.searchParams.get('npcType');
    if (npcType) {
      npcTypeList = npcType.split(',').map((x) => NpcType[x as keyof typeof NpcType].toString());
    }

    const minLevel = $page.url.searchParams.get('minLevel');
    const maxLevel = $page.url.searchParams.get('maxLevel');
    levelRange = [
      minLevel ? parseInt(minLevel) : 0,
      maxLevel ? parseInt(maxLevel) : 99
    ];

    isBossOnly = $page.url.searchParams.get('isBoss') === 'true';
    hasShopOnly = $page.url.searchParams.get('hasShop') === 'true';

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

  function updateParams(key: string, list: string[], enumerator: any) {
    if (list.length === 0) {
      $page.url.searchParams.delete(key);
    } else {
      $page.url.searchParams.set(key, list.map((x) => enumerator[x]).join(','));
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

  const debouncedLevelRangeChange = debounce(
    async (prevRange: number[], newRange: number[]) => {
      // Only fetch if values actually changed
      if (prevRange[0] !== newRange[0] || prevRange[1] !== newRange[1]) {
        if (newRange[0] !== 0) {
          $page.url.searchParams.set('minLevel', newRange[0].toString());
        } else {
          $page.url.searchParams.delete('minLevel');
        }

        if (newRange[1] !== 99) {
          $page.url.searchParams.set('maxLevel', newRange[1].toString());
        } else {
          $page.url.searchParams.delete('maxLevel');
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

  function handleLevelRangeChange(details: { value: number[] }) {
    const prevRange = [...levelRange];
    levelRange = details.value;
    debouncedLevelRangeChange(prevRange, details.value);
  }
</script>

<svelte:head>
  <title>MS2 Handbook - NPCs</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">NPCs</h1>
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
            $page.url.searchParams.delete('npcType');
            $page.url.searchParams.delete('minLevel');
            $page.url.searchParams.delete('maxLevel');
            $page.url.searchParams.delete('isBoss');
            $page.url.searchParams.delete('hasShop');
            $page.url.searchParams.delete('search');
            $page.url.searchParams.delete('page');
            $page.url.searchParams.delete('limit');

            npcTypeList = [];
            levelRange = [1, 120];
            isBossOnly = false;
            hasShopOnly = false;

            currentPage = 1;
            pageSize = 10;
            searchTerm = '';

            goto($page.url.href, { keepFocus: true, replaceState: true });
            await fetchData(true);
          }}
        >
          <img src={`/icons/filter_alt_off.svg`} width="24" alt="Clear filters" />
        </button>
      </label>
    </div>
  </div>
  <div class="flex flex-col gap-3 lg:flex-row">
    <label class="label w-full lg:w-1/2">
      <span>Filter by NPC type</span>
      <ComboboxChips
        name="npcType"
        bind:value={npcTypeList}
        whitelist={enumToWhitelist(NpcType)}
        placeholder="Select NPC type..."
        onValueChange={async () => {
          updateParams('npcType', npcTypeList, NpcType);
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <div class="w-full lg:w-1/2">
      <RangeSlider
        label="Level Range"
        min={0}
        max={99}
        value={levelRange}
        onValueChange={handleLevelRangeChange}
      />
    </div>
  </div>
  <div class="flex flex-col gap-3 lg:flex-row mt-3">
    <label class="flex items-center space-x-2">
      <input
        class="checkbox bg-surface-700 border-surface-500 checked:bg-primary-500 checked:border-primary-500"
        type="checkbox"
        bind:checked={isBossOnly}
        onchange={async () => {
          if (isBossOnly) {
            $page.url.searchParams.set('isBoss', 'true');
          } else {
            $page.url.searchParams.delete('isBoss');
          }
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
      <span>Show bosses only</span>
    </label>
    <label class="flex items-center space-x-2">
      <input
        class="checkbox bg-surface-700 border-surface-500 checked:bg-primary-500 checked:border-primary-500"
        type="checkbox"
        bind:checked={hasShopOnly}
        onchange={async () => {
          if (hasShopOnly) {
            $page.url.searchParams.set('hasShop', 'true');
          } else {
            $page.url.searchParams.delete('hasShop');
          }
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
      <span>Show merchants only</span>
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
    <div class="w-1/2 py-4 pr-6 text-left lg:w-1/4">Icon</div>
    <div class="hidden py-4 pr-6 text-left lg:block lg:w-1/4">Id</div>
    <div class="py-4 pr-6 text-left lg:w-1/4">Name</div>
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
  {#each paginatedSource as npc}
    <a
      class="unstyled flex items-center border-b border-gray2 last:border-none hover:preset-tonal transition-colors"
      href={`/npcs/${npc.id}`}
    >
      <div class="flex w-1/2 flex-col items-center py-4 lg:w-1/4 lg:flex-row">
        <NpcImage portrait={npc.portrait} name={npc.name} />
        <CopyId id={npc.id} extraClass="mt-4 lg:hidden" />
      </div>
      <div class="hidden lg:block lg:w-1/4">
        <CopyId id={npc.id} />
      </div>
      <div class="text-left lg:w-1/4">{npc.title ?? npc.title} {npc.name}</div>
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