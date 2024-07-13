<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import CopyId from '$lib/components/CopyId.svelte';
  import NpcImage from '$lib/components/NpcImage.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import type { SearchNpc } from '$lib/types/Npc';
  import { Paginator, ProgressRadial, type PaginationSettings } from '@skeletonlabs/skeleton';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';

  let searchTerm = $page.url.searchParams.get('search') || '';
  let lastSearchTerm = searchTerm;

  let data: SearchNpc[][] = [];
  let loading = false;

  let paginator: PaginationSettings = {
    page: 0,
    limit: 10,
    size: 0,
    amounts: [10, 25, 50, 100, 200]
  };

  async function fetchData(clearCache: boolean) {
    // check if we have the data cached
    console.log(
      '🚀 ~ fetchData ~ data[paginator.page] && !clearCache:',
      data[paginator.page] && !clearCache
    );
    if (data[paginator.page] && !clearCache) {
      return;
    }

    const params = paramsBuilder([
      {
        name: 'search',
        value: searchTerm
      },
      {
        name: 'page',
        value: paginator.page
      },
      {
        name: 'limit',
        value: paginator.limit
      }
    ]);

    loading = true;
    const response = await fetch(url(`/api/npcs${params}`));

    const responseJson = await response.json();
    const npcs = responseJson.npcs as SearchNpc[];
    const total = responseJson.total as number;

    if (npcs.length === 0) {
      data = [];
      paginator = {
        page: 0,
        limit: paginator.limit,
        size: total,
        amounts: [10, 25, 50, 100, 200]
      } satisfies PaginationSettings;
      loading = false;
      return;
    }

    if (lastSearchTerm !== searchTerm || clearCache) {
      data = [];
    }

    data[paginator.page] = npcs;
    lastSearchTerm = searchTerm;

    const amounts = [10, 25, 50, 100, 200].filter((amount) => amount <= total);
    if (amounts.length === 0) {
      amounts.push(total);
      paginator.limit = total;
      $page.url.searchParams.set('limit', total.toString());
      goto($page.url.href, { keepFocus: true, replaceState: true });
    }
    if (paginator.limit < amounts[0]) {
      paginator.limit = amounts[0];
      $page.url.searchParams.set('limit', amounts[0].toString());
      goto($page.url.href, { keepFocus: true, replaceState: true });
    }

    paginator = {
      ...paginator,
      page: paginator.page,
      size: total,
      amounts: amounts
    } satisfies PaginationSettings;
    loading = false;
  }

  onMount(() => {
    paginator = {
      page: $page.url.searchParams.get('page') ? parseInt($page.url.searchParams.get('page')!) : 0,
      limit: $page.url.searchParams.get('limit')
        ? parseInt($page.url.searchParams.get('limit')!)
        : 10,
      size: 0,
      amounts: [10, 25, 50, 100, 200]
    } satisfies PaginationSettings;
    // load first batch onMount
    fetchData(false);
  });

  $: paginatedSource = data[paginator.page] || [];

  function onPageChange(e: CustomEvent): void {
    paginator.page = e.detail;
    $page.url.searchParams.set('page', e.detail);
    goto($page.url.href, { keepFocus: true, replaceState: true });
    fetchData(false);
  }

  function onAmountChange(e: CustomEvent): void {
    paginator.limit = e.detail;
    $page.url.searchParams.set('limit', e.detail);
    goto($page.url.href, { keepFocus: true, replaceState: true });
    fetchData(true);
  }

  const debouncedSearch = debounce(
    async () => {
      $page.url.searchParams.set('search', searchTerm);

      paginator.page = 0;
      $page.url.searchParams.set('page', '0');

      paginator.limit = 10;
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

<div class="mt-8 h-[1px]" />
<div class="main-container mx-4 rounded-xl px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">NPCs</h1>
  <input
    type="text"
    placeholder="Search 🔎"
    class="input w-1/2 px-4 py-2 border-token lg:w-1/3"
    bind:value={searchTerm}
    on:keyup={debouncedSearch}
  />

  <Paginator
    bind:settings={paginator}
    showFirstLastButtons
    on:page={onPageChange}
    on:amount={onAmountChange}
    class="mt-5"
  />

  <div class="flex flex-row border-b border-gray2">
    <div class="w-1/2 py-4 pr-6 text-left lg:w-1/4">Icon</div>
    <div class="hidden py-4 pr-6 text-left lg:block lg:w-1/4">Id</div>
    <div class="py-4 pr-6 text-left lg:w-1/4">Name</div>
  </div>
  {#if loading}
    <div class="flex items-center justify-center">
      <ProgressRadial width="w-32" />
    </div>
  {/if}
  {#if paginatedSource && paginatedSource.length === 0 && !loading}
    <div class="flex items-center justify-center">
      <h2 class="my-10">No items found</h2>
    </div>
  {/if}
  {#each paginatedSource as npc}
    <a
      class="unstyled flex cursor-pointer items-center border-b border-gray2 last:border-none hover:bg-surface-hover-token"
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
  <Paginator
    bind:settings={paginator}
    showFirstLastButtons
    on:page={onPageChange}
    on:amount={onAmountChange}
    class="mt-5"
  />
</div>
