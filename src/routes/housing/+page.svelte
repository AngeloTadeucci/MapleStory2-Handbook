<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import HousingBadge from '$lib/components/item/HousingBadge.svelte';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import { HOUSING_CATEGORIES, HOUSING_TOKENS } from '$lib/helpers/housing';
  import type { HousingSearchItem } from '$lib/types/Item';

  let searchTerm = $state('');
  let selectedCategory = $state('');
  let selectedCurrency = $state('');
  let buyableOnly = $state(false);
  let data: HousingSearchItem[][] = $state([]);
  let loading = $state(true);
  let currentPage = $state(1);
  let pageSize = $state(25);
  let totalItems = $state(0);
  const pageSizeOptions = [25, 50, 100, 200];

  function buildParams() {
    return paramsBuilder([
      { name: 'search', value: searchTerm },
      { name: 'category', value: selectedCategory },
      { name: 'currency', value: selectedCurrency },
      { name: 'buyable', value: buyableOnly ? 'true' : null },
      { name: 'page', value: currentPage - 1 },
      { name: 'limit', value: pageSize }
    ]);
  }

  async function fetchData(clearCache: boolean) {
    const dataIndex = currentPage - 1;
    if (data[dataIndex] && !clearCache) {
      return;
    }

    loading = true;
    const response = await fetch(`/api/housing${buildParams()}`);
    const responseJson = await response.json();
    const items = responseJson.items as HousingSearchItem[];
    const total = responseJson.total as number;

    if (clearCache) {
      data = [];
    }

    const newData = [...data];
    newData[dataIndex] = items;
    data = newData;
    totalItems = total;
    loading = false;
  }

  const paginatedSource = $derived(data[currentPage - 1] || []);

  function syncUrl() {
    const params = buildParams();
    goto(`/housing${params}`, { keepFocus: true, replaceState: true });
  }

  function resetAndFetch() {
    currentPage = 1;
    syncUrl();
    fetchData(true);
  }

  const debouncedSearch = debounce(resetAndFetch, 400, { maxWait: 1000 });

  function onPageChange(newPage: number) {
    currentPage = newPage;
    syncUrl();
    fetchData(false);
  }

  function onPageSizeChange(newSize: number) {
    pageSize = newSize;
    resetAndFetch();
  }

  onMount(() => {
    searchTerm = $page.url.searchParams.get('search') || '';
    selectedCategory = $page.url.searchParams.get('category') || '';
    selectedCurrency = $page.url.searchParams.get('currency') || '';
    buyableOnly = $page.url.searchParams.get('buyable') === 'true';
    currentPage = $page.url.searchParams.get('page') ? Number($page.url.searchParams.get('page')) + 1 : 1;
    pageSize = $page.url.searchParams.get('limit') ? Number($page.url.searchParams.get('limit')) : 25;
    fetchData(false);
  });
</script>

<svelte:head>
  <title>MS2 Handbook - Housing</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Housing</h1>

  <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
    <input
      type="text"
      placeholder="Search"
      class="input w-full bg-surface-700 px-4 py-2 text-surface-50 placeholder:text-surface-400 lg:w-1/3"
      bind:value={searchTerm}
      oninput={debouncedSearch}
    />

    <select
      bind:value={selectedCategory}
      onchange={resetAndFetch}
      class="input bg-surface-700 px-3 py-2 text-surface-50"
    >
      <option value="">All Categories</option>
      {#each HOUSING_CATEGORIES as category}
        <option value={category.value}>{category.label}</option>
      {/each}
    </select>

    <select
      bind:value={selectedCurrency}
      onchange={resetAndFetch}
      class="input bg-surface-700 px-3 py-2 text-surface-50"
    >
      <option value="">All Currencies</option>
      {#each HOUSING_TOKENS as token}
        <option value={token.value}>{token.label}</option>
      {/each}
    </select>

    <label class="flex items-center gap-2 text-sm text-surface-200">
      <input type="checkbox" bind:checked={buyableOnly} onchange={resetAndFetch} />
      Buyable
    </label>
  </div>

  <div class="mt-6 flex items-center justify-between gap-3">
    <p class="text-sm text-surface-400">{totalItems} item{totalItems === 1 ? '' : 's'}</p>
    <PaginationWrapper
      count={totalItems}
      {pageSize}
      page={currentPage}
      {pageSizeOptions}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
  {:else if paginatedSource.length === 0}
    <div class="flex items-center justify-center py-12">
      <h2>No housing items found</h2>
    </div>
  {:else}
    <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#each paginatedSource as item (item.id)}
        <a href={`/items/${item.id}`} class="unstyled rounded bg-surface-700 p-3 transition-colors hover:bg-surface-600">
          <div class="flex gap-3">
            <ItemImage
              iconPath={item.icon_path}
              rarity={item.rarity}
              name={item.name}
              isOutfit={item.is_outfit}
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{item.name}</p>
              <p class="text-xs text-surface-400">#{item.id}</p>
              <div class="mt-2">
                <HousingBadge
                  category={item.housing_category}
                  tokenType={item.token_type}
                  price={item.price}
                  buyable={item.buyable}
                  compact
                />
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
