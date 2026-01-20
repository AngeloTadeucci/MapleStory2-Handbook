<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import CopyId from '$lib/components/CopyId.svelte';
  import NpcImage from '$lib/components/npc/NpcImage.svelte';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import type { SearchNpc } from '$lib/types/Npc';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
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
      }
    ]);

    loading = true;
    const response = await fetch(url(`/api/npcs${params}`));

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
</script>

<svelte:head>
  <title>MS2 Handbook - NPCs</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">NPCs</h1>
  <input
    type="text"
    placeholder="Search 🔎"
    class="input w-1/2 px-4 py-2 lg:w-1/3 bg-surface-700 text-surface-50 border-transparent placeholder:text-surface-400"
    bind:value={searchTerm}
    onkeyup={debouncedSearch}
  />

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
      href={url(`/npcs/${npc.id}`)}
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
