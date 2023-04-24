<script lang="ts">
	import { onMount } from 'svelte';
	import ItemImage from '$lib/components/ItemImage.svelte';
	import { unescape } from '$lib/helpers/htmlParser';
	import { url } from '$lib/helpers/addBasePath';
	import CopyId from '$lib/components/CopyId.svelte';
	import debounce from 'lodash.debounce';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import IntersectionObserver from 'svelte-intersection-observer';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { SearchItem } from '../../types/Item';

	let searchPage: number = 0;
	let searchTerm = $page.url.searchParams.get('search') || '';

	let data: SearchItem[] = [];
	let lastBatch: SearchItem[] = [];

	let lastSearchTerm = searchTerm;

	async function fetchData() {
		const response = await fetch(
			url(`/api/items?search=${searchTerm}&page=${searchPage}&limit=20`)
		);

		const items = await response.json();

		if (items.length === 0) {
			data = [];
			return;
		}

		// check if items content is the same as the data
		if (data.length > 0 && data[data.length - 1].id === items[items.length - 1].id) {
			return;
		}
		if (lastSearchTerm !== searchTerm) {
			data = [];
		}

		lastBatch = items;
		data = [...data, ...items];
		lastSearchTerm = searchTerm;
	}

	onMount(() => {
		// load first batch onMount
		fetchData();
	});

	function getDescription(item: SearchItem) {
		if (item.main_description.length > 0) {
			return unescape(item.main_description);
		} else if (item.guide_description.length > 0) {
			return unescape(item.guide_description);
		} else if (item.tooltip_description.length > 0) {
			return unescape(item.tooltip_description);
		} else {
			return 'No description';
		}
	}

	let element: any;
	let intersecting: boolean;

	$: {
		if (intersecting) {
			intersecting = false;

			debounce(
				() => {
					searchPage++;
					fetchData();
				},
				300,
				{
					maxWait: 1000
				}
			)();
		}
	}
</script>

<svelte:head>
	<title>MS2 Handbook - Items</title>
</svelte:head>

<div class="main-container mx-4 rounded-xl bg-zinc-800 px-5 pb-40 pt-2 lg:m-auto lg:w-3/4">
	<h1 class="mb-4 text-4xl font-bold">Items</h1>
	<input
		type="text"
		placeholder="Search 🔎"
		class="mb-4 rounded-lg border border-blue-ascent p-2"
		bind:value={searchTerm}
		on:keyup={debounce(
			async () => {
				$page.url.searchParams.set('search', searchTerm);
				searchPage = 0;
				goto($page.url.href, { keepFocus: true, replaceState: true, noScroll: true });
				await fetchData();
			},
			500,
			{
				maxWait: 1000
			}
		)}
	/>

	<div class="flex flex-row border-b border-blue-ascent">
		<div class="w-1/2 py-4 pr-6 text-left lg:w-1/4">Icon</div>
		<div class="hidden py-4 pr-6 text-left lg:block lg:w-1/4">Id</div>
		<div class="py-4 pr-6 text-left lg:w-1/4">Name</div>
		<div class="hidden py-4 pr-6 text-left lg:block lg:w-1/4">Description</div>
	</div>
	{#each data as item}
		<a
			href={url(`/items/${item.id}`)}
			class="flex items-center border-b border-blue-ascent py-4 last:border-none hover:bg-zinc-800"
		>
			<div class="flex w-1/2 flex-col items-center py-4 lg:w-1/4 lg:flex-row">
				<ItemImage icon_path={item.icon_path} name={item.name} rarity={item.rarity} />
				<CopyId id={item.id} extraClass="lg:hidden mt-4" />
			</div>
			<div class="hidden lg:block lg:w-1/4">
				<CopyId id={item.id} />
			</div>
			<div class="lg:w-1/4">{item.name}</div>
			<div class="hidden h-full w-96 lg:block lg:w-1/4">
				<p class="line-clamp-3">{@html getDescription(item)}</p>
			</div>
		</a>
	{/each}
	{#if data.length > 0}
		<div class="mt-5 flex justify-center">
			{#if lastBatch.length < 20}
				<h2>No more results</h2>
			{:else}
				<IntersectionObserver {element} bind:intersecting threshold={0.1}>
					<div bind:this={element}>
						<Spinner />
					</div>
				</IntersectionObserver>
			{/if}
		</div>
	{/if}
</div>
