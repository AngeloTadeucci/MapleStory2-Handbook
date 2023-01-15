<script lang="ts">
	import { onMount } from 'svelte';
	import ItemImage from '$lib/components/ItemImage.svelte';
	import { unescape } from '$lib/helpers/htmlParser';
	import type { SearchItem } from 'src/types/Item';
	import { url } from '$lib/helpers/addBasePath';
	import CopyId from '$lib/components/CopyId.svelte';

	let page = 0;
	let searchTerm = '';

	let data: SearchItem[] = [];

	async function fetchData() {
		const response = await fetch(url(`/api/items?search=${searchTerm}&page=${page}&limit=20`));

		const items = await response.json();

		if (items.length === 0) {
			data = [];
			return;
		}

		// check if items content is the same as the data
		if (data.length > 0 && data[data.length - 1].id === items[items.length - 1].id) {
			return;
		}

		data = items;
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
</script>

<svelte:head>
	<title>MS2 Handbook - Items</title>
</svelte:head>

<div>
	<h1 class="mb-4 text-4xl font-bold">Items</h1>
	<input
		type="text"
		placeholder="Search 🔎"
		class="mb-4 rounded-lg border p-2"
		bind:value={searchTerm}
		on:keyup={async (e) => {
			if (e.key === 'Enter') {
				await fetchData();
			}

			if (e.key === 'Escape') {
				searchTerm = '';
			}

			if (searchTerm.length === 0) {
				await fetchData();
			}

			if (searchTerm.length > 2) {
				await fetchData();
			}
		}}
	/>

	<table class="min-w-full">
		<thead class="border-b">
			<tr>
				<th scope="col" class="py-4 pr-6 text-left">Icon</th>
				<th scope="col" class="hidden py-4 pr-6 text-left lg:table-caption">Id</th>
				<th scope="col" class="py-4 pr-6 text-left">Name</th>
				<th scope="col" class="hidden py-4 pr-6 text-left lg:table-caption">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each data as item}
				<tr
					class="cursor-pointer border-b last:border-none hover:bg-zinc-800"
					on:click={() => {
						// shit code, why can't we use anchor tag around the whole row?
						window.location.href = url(`/items/${item.id}`);
					}}
				>
					<td class="flex flex-col items-center justify-center py-4 lg:table-cell lg:flex-row">
						<ItemImage icon_path={item.icon_path} name={item.name} rarity={item.rarity} />
						<CopyId id={item.id} extraClass="lg:hidden mt-4" />
					</td>
					<td class="hidden lg:table-cell">
						<CopyId id={item.id} />
					</td>
					<td class="align-middle">{item.name}</td>
					<td class="hidden h-full w-96 align-middle lg:table-cell">{getDescription(item)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
