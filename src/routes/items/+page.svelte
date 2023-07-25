<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Job, Rarity, SlotName, enumToWhitelist } from '$lib/Enums';
	import CopyId from '$lib/components/CopyId.svelte';
	import ItemImage from '$lib/components/ItemImage.svelte';
	import SelectChips from '$lib/components/SelectChips.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import itemHelper from '$lib/helpers/itemHelper';
	import paramsBuilder from '$lib/helpers/paramsBuilder';
	import type { SearchItem } from '$lib/types/Item';
	import { Paginator, ProgressRadial } from '@skeletonlabs/skeleton';
	import type { PaginationSettings } from '@skeletonlabs/skeleton/dist/components/Paginator/types';
	import debounce from 'lodash.debounce';
	import { onMount } from 'svelte';

	let searchTerm = $page.url.searchParams.get('search') || '';
	let paginator = {
		currentPage: $page.url.searchParams.get('page')
			? parseInt($page.url.searchParams.get('page')!)
			: 0,
		offset: 0,
		limit: $page.url.searchParams.get('limit')
			? parseInt($page.url.searchParams.get('limit')!)
			: 10,
		size: 0,
		amounts: [10, 25, 50, 100, 200]
	} as PaginatorType;

	let rarityList: string[] = (() => {
		let rarity = $page.url.searchParams.get('rarity');
		if (!rarity) {
			return [];
		}

		return rarity.split(',').map((x) => Rarity[x as keyof typeof Rarity].toString());
	})();

	let slotList: string[] = (() => {
		let slot = $page.url.searchParams.get('slot');
		if (!slot) {
			return [];
		}

		return slot.split(',').map((x) => SlotName[x as keyof typeof SlotName].toString());
	})();

	let jobList: string[] = (() => {
		let job = $page.url.searchParams.get('job');
		if (!job) {
			return [];
		}

		return job.split(',').map((x) => Job[x as keyof typeof Job].toString());
	})();

	let data: SearchItem[] = [];
	let lastBatch: SearchItem[] = [];

	let lastSearchTerm = searchTerm;

	let loadedPages: number[] = [];
	let loading = false;

	type PaginatorType = PaginationSettings & {
		currentPage: number;
	};

	function buildParams(
		search: string,
		page: number,
		limit: number,
		rarity: string,
		slot: string,
		job: string
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
				name: 'slot',
				value: slot
			},
			{
				name: 'job',
				value: job
			}
		]);
	}

	async function fetchData(resetPaginator: boolean) {
		loading = true;
		let response;
		// check if data doesnt have items but current page is not 0
		if (data.length === 0 && paginator.currentPage !== 0) {
			loadedPages = (() => {
				let pages = [];
				for (let i = 0; i < paginator.currentPage; i++) {
					pages.push(i);
				}
				return pages;
			})();

			response = await fetch(
				url(
					`/api/items${buildParams(
						searchTerm,
						0,
						paginator.limit * (paginator.currentPage + 1),
						rarityList.map((x) => Rarity[x as keyof typeof Rarity]).join(','),
						slotList.map((x) => SlotName[x as keyof typeof SlotName]).join(','),
						jobList.map((x) => Job[x as keyof typeof Job]).join(',')
					)}`
				)
			);
		} else {
			response = await fetch(
				url(
					`/api/items${buildParams(
						searchTerm,
						paginator.currentPage,
						paginator.limit,
						rarityList.map((x) => Rarity[x as keyof typeof Rarity]).join(','),
						slotList.map((x) => SlotName[x as keyof typeof SlotName]).join(','),
						jobList.map((x) => Job[x as keyof typeof Job]).join(',')
					)}`
				)
			);
		}

		const responseJson = await response.json();
		const items = responseJson.items as SearchItem[];
		const total = responseJson.total as number;

		if (items.length === 0) {
			data = [];
			paginator = {
				currentPage: 0,
				offset: 0,
				limit: paginator.limit,
				size: total,
				amounts: [10, 25, 50, 100, 200]
			};
			loading = false;
			return;
		}

		if (lastSearchTerm !== searchTerm || resetPaginator) {
			data = [];
			loadedPages = [];
		}

		lastBatch = items;
		data = [...data, ...items];
		lastSearchTerm = searchTerm;
		loadedPages.push(paginator.currentPage);

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
			offset: paginator.currentPage,
			size: total,
			amounts: amounts
		} as PaginatorType;
		loading = false;
	}

	$: paginatedSource = data.slice(
		paginator.offset * paginator.limit, // start
		paginator.offset * paginator.limit + paginator.limit // end
	);

	onMount(() => {
		// load first batch onMount
		fetchData(false);
	});

	function onPageChange(e: CustomEvent): void {
		paginator.currentPage = e.detail;
		$page.url.searchParams.set('page', e.detail);
		goto($page.url.href, { keepFocus: true, replaceState: true });
		if (!loadedPages.includes(e.detail)) {
			fetchData(false);
		}
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
</script>

<svelte:head>
	<title>MS2 Handbook - Items</title>
</svelte:head>

<div class="mt-8 h-[1px]" />
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
	<h1 class="mb-4 text-4xl font-bold">Items</h1>
	<div class="mb-4 flex items-center justify-between">
		<input
			type="text"
			placeholder="Search 🔎"
			class="input w-1/2 px-4 py-2 border-token lg:w-1/3"
			bind:value={searchTerm}
			on:keyup={debounce(
				async () => {
					$page.url.searchParams.set('search', searchTerm);

					paginator.currentPage = 0;
					$page.url.searchParams.set('page', '0');

					goto($page.url.href, { keepFocus: true, replaceState: true });
					await fetchData(true);
				},
				500,
				{
					maxWait: 1000
				}
			)}
		/>
		<div>
			<label class="label flex flex-col items-center justify-center">
				<span>Clear filters</span>
				<button
					type="button"
					class="btn-icon btn-icon-sm variant-filled flex items-center justify-center"
					on:click={async () => {
						$page.url.searchParams.delete('rarity');
						$page.url.searchParams.delete('slot');
						$page.url.searchParams.delete('job');
						$page.url.searchParams.delete('search');
						$page.url.searchParams.delete('page');
						$page.url.searchParams.delete('limit');

						rarityList = [];
						slotList = [];
						jobList = [];

						paginator.currentPage = 0;
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
		<!-- svelte-ignore a11y-label-has-associated-control -->
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
					goto($page.url.href, { keepFocus: true, replaceState: true });
					await fetchData(true);
				}}
			/>
		</label>
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="label lg:w-1/3">
			<span>Filter by item type</span>
			<SelectChips
				name="slot"
				bind:value={slotList}
				whitelist={enumToWhitelist(SlotName)}
				allowDuplicates={false}
				allowUpperCase
				onValueChange={async () => {
					updateParams('slot', slotList, SlotName);
					goto($page.url.href, { keepFocus: true, replaceState: true });
					await fetchData(true);
				}}
			/>
		</label>
		<!-- svelte-ignore a11y-label-has-associated-control -->
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
					goto($page.url.href, { keepFocus: true, replaceState: true });
					await fetchData(true);
				}}
			/>
		</label>
	</div>
	<Paginator
		bind:settings={paginator}
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
				<ItemImage icon_path={item.icon_path} name={item.name} rarity={item.rarity} />
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
		on:page={onPageChange}
		on:amount={onAmountChange}
		class="mt-5"
	/>
</div>
