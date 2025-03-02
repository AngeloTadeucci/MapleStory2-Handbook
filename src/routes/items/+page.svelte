<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import CopyId from '$lib/components/CopyId.svelte';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import SelectChips from '$lib/components/SelectChips.svelte';
  import { Job, Rarity, enumToWhitelist } from '$lib/Enums';
  import { url } from '$lib/helpers/addBasePath';
  import itemHelper from '$lib/helpers/itemHelper';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import { getItemTypeDisplayNames, getItemTypeKeyByDisplayName } from '$lib/itemTypes';
  import type { SearchItem } from '$lib/types/Item';
  import { Paginator, ProgressRadial, type PaginationSettings } from '@skeletonlabs/skeleton';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';

  let searchTerm = $state($page.url.searchParams.get('search') || '');

  let data: SearchItem[][] = $state([]);
  let loading = $state(false);

  let paginator: PaginationSettings = $state({
    page: 0,
    limit: 10,
    size: 0,
    amounts: [10, 25, 50, 100, 200]
  });

  let rarityList: string[] = $state(
    (() => {
      let rarity = $page.url.searchParams.get('rarity');
      if (!rarity) {
        return [];
      }

      return rarity.split(',').map((x) => Rarity[x as keyof typeof Rarity].toString());
    })()
  );

  let jobList: string[] = $state(
    (() => {
      let job = $page.url.searchParams.get('job');
      if (!job) {
        return [];
      }

      return job.split(',').map((x) => Job[x as keyof typeof Job].toString());
    })()
  );

  let itemTypeList: string[] = $state(
    (() => {
      let type = $page.url.searchParams.get('type');
      if (!type) {
        return [];
      }

      return type
        .split(',')
        .map((x) => getItemTypeKeyByDisplayName(x))
        .filter((x): x is string => x !== undefined);
    })()
  );

  function buildParams(
    search: string,
    page: number,
    limit: number,
    rarity: string,
    job: string,
    type: string
  ) {
    return paramsBuilder([
      {
        name: 'search',
        value: search
      },
      {
        name: 'page',
        value: page
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
      }
    ]);
  }

  async function fetchData(clearCache: boolean) {
    let lastSearchTerm = searchTerm;

    // check if we have the data cached
    if (data[paginator.page] && !clearCache) {
      return;
    }

    const params = buildParams(
      searchTerm,
      paginator.page,
      paginator.limit,
      rarityList.map((x) => Rarity[x as keyof typeof Rarity]).join(','),
      jobList.map((x) => Job[x as keyof typeof Job]).join(','),
      itemTypeList
        .map((x) => getItemTypeKeyByDisplayName(x))
        .filter((x) => x)
        .join(',')
    );

    loading = true;
    const response = await fetch(url(`/api/items${params}`));

    const responseJson = await response.json();
    const items = responseJson.items as SearchItem[];
    const total = responseJson.total as number;

    if (items.length === 0) {
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

    data[paginator.page] = items;
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

  let paginatedSource = $derived(data[paginator.page] || []);

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
  <title>MS2 Handbook - Items</title>
</svelte:head>

<div class="mt-8 h-[1px]"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Items</h1>
  <div class="mb-4 flex items-center justify-between">
    <input
      type="text"
      placeholder="Search 🔎"
      class="input w-1/2 px-4 py-2 border-token lg:w-1/3"
      bind:value={searchTerm}
      onkeyup={debouncedSearch}
    />
    <div>
      <label class="label flex flex-col items-center justify-center">
        <span>Clear filters</span>
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-filled flex items-center justify-center"
          onclick={async () => {
            $page.url.searchParams.delete('rarity');
            $page.url.searchParams.delete('job');
            $page.url.searchParams.delete('search');
            $page.url.searchParams.delete('page');
            $page.url.searchParams.delete('limit');
            $page.url.searchParams.delete('type');

            rarityList = [];
            jobList = [];
            itemTypeList = [];

            paginator.page = 0;
            paginator.limit = 10;
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
    <label class="label lg:w-1/3">
      <span>Filter by rarity</span>
      <SelectChips
        name="rarity"
        bind:value={rarityList}
        whitelist={enumToWhitelist(Rarity)}
        allowDuplicates={false}
        allowUpperCase
        onValueChange={async () => {
          updateParams('rarity', rarityList, Rarity);
          paginator.page = 0;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <label class="label lg:w-1/3">
      <span>Filter by category</span>
      <SelectChips
        name="itemType"
        bind:value={itemTypeList}
        whitelist={getItemTypeDisplayNames()}
        allowDuplicates={false}
        allowUpperCase
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
          paginator.page = 0;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="label lg:w-1/3">
      <span>Filter by class</span>
      <SelectChips
        name="class"
        bind:value={jobList}
        whitelist={enumToWhitelist(Job)}
        allowDuplicates={false}
        allowUpperCase
        onValueChange={async () => {
          updateParams('job', jobList, Job);
          paginator.page = 0;
          $page.url.searchParams.set('page', '0');
          goto($page.url.href, { keepFocus: true, replaceState: true });
          await fetchData(true);
        }}
      />
    </label>
  </div>
  <Paginator
    bind:settings={paginator}
    showFirstLastButtons
    on:page={onPageChange}
    on:amount={onAmountChange}
    class="mt-5"
  />
  <div class="flex flex-row border-b border-gray2">
    <div class="w-1/2 py-4 pr-6 text-left lg:w-2/12">Icon</div>
    <div class="hidden py-4 pr-6 text-left lg:block lg:w-2/12">Id</div>
    <div class="py-4 pr-6 text-left lg:w-1/3">Name</div>
    <div class="hidden py-4 pr-6 text-left lg:block lg:w-1/3">Description</div>
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
  {#each paginatedSource as item}
    <a
      href={url(`/items/${item.id}`)}
      class="unstyled flex items-center border-b border-gray2 last:border-none hover:bg-surface-hover-token"
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
  <Paginator
    bind:settings={paginator}
    showFirstLastButtons
    on:page={onPageChange}
    on:amount={onAmountChange}
    class="mt-5"
  />
</div>
