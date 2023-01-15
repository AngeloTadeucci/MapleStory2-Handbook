<script lang="ts">
	import CopyId from '$lib/components/CopyId.svelte';
	import NpcImage from '$lib/components/NpcImage.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import type { SearchNpc } from 'src/types/Npc';
	import { onMount } from 'svelte';

	let page = 0;
	let searchTerm = '';

	let data: SearchNpc[] = [];

	async function fetchData() {
		const response = await fetch(url(`/api/npcs?search=${searchTerm}&page=${page}&limit=20`));

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
</script>

<svelte:head>
	<title>MS2 Handbook - Npcs</title>
</svelte:head>

<div>
	<h1 class="mb-4 text-4xl font-bold">Npcs</h1>
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
			</tr>
		</thead>
		<tbody>
			{#each data as npc}
				<tr
					class="cursor-pointer border-b last:border-none hover:bg-zinc-800"
					on:click={() => {
						// shit code, why can't we use anchor tag around the whole row?
						window.location.href = url(`/npcs/${npc.id}`);
					}}
				>
					<td class="flex flex-col items-center justify-center py-4 lg:table-cell lg:flex-row">
						<NpcImage portrait={npc.portrait} name={npc.name} />
						<CopyId id={npc.id} extraClass="mt-4 lg:hidden" />
					</td>
					<td class="hidden lg:table-cell">
						<CopyId id={npc.id} />
					</td>
					<td class="align-middle">{npc.name}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
