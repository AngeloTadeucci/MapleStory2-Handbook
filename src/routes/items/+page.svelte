<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import CopyId from '$lib/components/CopyId.svelte';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import ComboboxChips from '$lib/components/ComboboxChips.svelte';
  import { Job, Rarity, Gender, enumToWhitelist } from '$lib/Enums';
  import { url } from '$lib/helpers/addBasePath';
  import itemHelper from '$lib/helpers/itemHelper';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import { getItemTypeDisplayNames, getItemTypeKeyByDisplayName } from '$lib/itemTypes';
  import type { SearchItem } from '$lib/types/Item';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';

  let searchTerm = $state('');

  let data: SearchItem[][] = $state([]);
  let loading = $state(true);

  // Pagination state for Skeleton v4
  let currentPage = $state(1);
  let pageSize = $state(10);
  let totalItems = $state(0);
  const pageSizeOptions = [10, 25, 50, 100, 200];

  let rarityList: string[] = $state([]);
  let jobList: string[] = $state([]);
  let itemTypeList: string[] = $state([]);
  let outfitOnly = $state(false);
  let genderList: string[] = $state([]);
  let setItemsOnly = $state(false);

  function buildParams(
    search: string,
    page: number,
    limit: number,
    rarity: string,
    job: string,
    type: string,
    outfit: boolean,
    gender: string,
    setItems: boolean
  ) {
    // API expects 0-indexed page, but Skeleton v4 uses 1-indexed
    return paramsBuilder([
      {
        name: 'search',
        value: search
      },
      {
        name: 'page',
        value: page - 1
      },
      {
        name: 'limit',
        value: limit
      },
      {
        name: 'rarity',
        value: rarity
      },
      {
        name: 'job',
        value: job
      },
      {
        name: 'type',
        value: type
      },
      {
        name: 'outfit',
        value: outfit ? 'true' : null
      },
      {
        name: 'gender',
        value: gender
      },
      {
        name: 'setItems',
        value: setItems ? 'true' : null
      }
    ]);
  }

  async function fetchData(clearCache: boolean) {
    let lastSearchTerm = searchTerm;

    // Skeleton v4 uses 1-indexed pages, data array is 0-indexed
    const dataIndex = currentPage - 1;

    // check if we have the data cached
    if (data[dataIndex] && !clearCache) {
      return;
    }

    const params = buildParams(
      searchTerm,
      currentPage,
      pageSize,
      rarityList.map((x) => Rarity[x as keyof typeof Rarity]).join(','),
      jobList.map((x) => Job[x as keyof typeof Job]).join(','),
      itemTypeList
        .map((x) => getItemTypeKeyByDisplayName(x))
        .filter((x) => x)
        .join(','),
      outfitOnly,
      genderList.map((x) => Gender[x as keyof typeof Gender]).join(','),
      setItemsOnly
    );

    loading = true;
    const response = await fetch(url(`/api/items${params}`));

    const responseJson = await response.json();
    const items = responseJson.items as SearchItem[];
    const total = responseJson.total as number;

    if (items.length === 0) {
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
    newData[dataIndex] = items;
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

  let paginatedSource = $derived(data[currentPage - 1] || []);

  onMount(() => {
    // Initialize all state from URL params
    searchTerm = $page.url.searchParams.get('search') || '';

    const urlPage = $page.url.searchParams.get('page');
    currentPage = urlPage ? parseInt(urlPage) + 1 : 1;
    pageSize = $page.url.searchParams.get('limit')
      ? parseInt($page.url.searchParams.get('limit')!)
      : 10;

    const rarity = $page.url.searchParams.get('rarity');
    if (rarity) {
      rarityList = rarity.split(',').map((x) => Rarity[x as keyof typeof Rarity].toString());
    }

    const job = $page.url.searchParams.get('job');
    if (job) {
      jobList = job.split(',').map((x) => Job[x as keyof typeof Job].toString());
    }

    const type = $page.url.searchParams.get('type');
    if (type) {
      itemTypeList = type.split(',').map((x) => getItemTypeKeyByDisplayName(x)).filter((x): x is string => x !== undefined);
    }

    outfitOnly = $page.url.searchParams.get('outfit') === 'true';

    const gender = $page.url.searchParams.get('gender');
    if (gender) {
      genderList = gender.split(',').map((x) => Gender[x as keyof typeof Gender].toString());
    }

    setItemsOnly = $page.url.searchParams.get('setItems') === 'true';

    // load first batch onMount
    fetchData(false);
  });

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
</script>

<svelte:head>
  <title>MS2 Handbook - Items</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Items</h1>
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
            $page.url.searchParams.delete('rarity');
            $page.url.searchParams.delete('job');
            $page.url.searchParams.delete('search');
            $page.url.searchParams.delete('page');
            $page.url.searchParams.delete('limit');
            $page.url.searchParams.delete('type');
            $page.url.searchParams.delete('outfit');
            $page.url.searchParams.delete('gender');
            $page.url.searchParams.delete('setItems');

            rarityList = [];
            jobList = [];
            itemTypeList = [];
            outfitOnly = false;
            genderList = [];
            setItemsOnly = false;

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
    <label class="label w-full">
      <span>Filter by rarity</span>
      <ComboboxChips
        name="rarity"
        bind:value={rarityList}
        whitelist={enumToWhitelist(Rarity)}
        placeholder="Select rarity..."
        onValueChange={async () => {
          updateParams('rarity', rarityList, Rarity);
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <label class="label w-full">
      <span>Filter by category</span>
      <ComboboxChips
        name="itemType"
        bind:value={itemTypeList}
        whitelist={getItemTypeDisplayNames()}
        placeholder="Select category..."
        onValueChange={async () => {
          if (itemTypeList.length === 0) {
            $page.url.searchParams.delete('type');
          } else {
            $page.url.searchParams.set(
              'type',
              itemTypeList
                .map((x) => getItemTypeKeyByDisplayName(x))
                .filter((x) => x)
                .join(',')
            );
          }
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="label w-full">
      <span>Filter by class</span>
      <ComboboxChips
        name="class"
        bind:value={jobList}
        whitelist={enumToWhitelist(Job)}
        placeholder="Select class..."
        onValueChange={async () => {
          updateParams('job', jobList, Job);
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <label class="label w-full">
      <span>Filter by gender</span>
      <ComboboxChips
        name="gender"
        bind:value={genderList}
        whitelist={enumToWhitelist(Gender)}
        placeholder="Select gender..."
        onValueChange={async () => {
          updateParams('gender', genderList, Gender);
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
  </div>
  <div class="flex flex-col gap-3 lg:flex-row mt-3">
    <label class="flex items-center space-x-2">
      <input
        class="checkbox bg-surface-700 border-surface-500 checked:bg-primary-500 checked:border-primary-500"
        type="checkbox"
        bind:checked={outfitOnly}
        onchange={async () => {
          if (outfitOnly) {
            $page.url.searchParams.set('outfit', 'true');
          } else {
            $page.url.searchParams.delete('outfit');
          }
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
      <span>Show outfits only</span>
    </label>
    <label class="flex items-center space-x-2">
      <input
        class="checkbox bg-surface-700 border-surface-500 checked:bg-primary-500 checked:border-primary-500"
        type="checkbox"
        bind:checked={setItemsOnly}
        onchange={async () => {
          if (setItemsOnly) {
            $page.url.searchParams.set('setItems', 'true');
          } else {
            $page.url.searchParams.delete('setItems');
          }
          currentPage = 1;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
      <span>Show set items only</span>
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
    <div class="w-1/2 py-4 pr-6 text-left lg:w-2/12">Icon</div>
    <div class="hidden py-4 pr-6 text-left lg:block lg:w-2/12">Id</div>
    <div class="py-4 pr-6 text-left lg:w-1/3">Name</div>
    <div class="hidden py-4 pr-6 text-left lg:block lg:w-1/3">Description</div>
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
  {#each paginatedSource as item}
    <a
      href={url(`/items/${item.id}`)}
      class="unstyled flex items-center border-b border-gray2 last:border-none hover:preset-tonal transition-colors"
    >
      <div class="flex w-1/2 flex-col items-center py-4 lg:w-2/12 lg:flex-row">
        <ItemImage
          iconPath={item.icon_path}
          name={item.name}
          rarity={item.rarity}
          isOutfit={item.is_outfit}
        />
        <CopyId id={item.id} extraClass="lg:hidden mt-4" />
      </div>
      <div class="hidden lg:block lg:w-2/12">
        <CopyId id={item.id} />
      </div>
      <div class="lg:w-1/3">{item.name}</div>
      <div class="hidden h-full w-96 lg:block lg:w-1/3">
        <p class="line-clamp-3">{@html itemHelper.getDescription(item)}</p>
      </div>
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
