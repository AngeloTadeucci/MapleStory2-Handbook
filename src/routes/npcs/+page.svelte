<script lang="ts">
	import NpcImage from '$lib/components/NpcImage.svelte';
	import type { SearchNpc } from 'src/types/Npc';
	import { onMount } from 'svelte';

	let page = 0;
	let searchTerm = '';

	let data: SearchNpc[] = [];

	async function fetchData() {
		const response = await fetch(`/api/npcs?search=${searchTerm}&page=${page}&limit=20`);

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
						window.location.href = `/npcs/${npc.id}`;
					}}
				>
					<td class="flex flex-col items-center justify-center py-4 lg:table-cell lg:flex-row">
						<NpcImage portrait={npc.portrait} name={npc.name} />

						<button
							on:click={(e) => {
								navigator.clipboard.writeText(npc.id.toString());
								e.stopPropagation();
							}}
							title="Copy ID"
							class="mt-4 flex items-center justify-center gap-2 rounded-lg border p-1 lg:hidden"
						>
							{npc.id}
							<img src="/icons/copy-content.svg" width={20} height={20} alt="Copy" />
						</button>
					</td>
					<td class="hidden lg:table-cell">
						<button
							on:click={(e) => {
								navigator.clipboard.writeText(npc.id.toString());
								e.stopPropagation();
							}}
							title="Copy ID"
							class="flex items-center justify-start gap-2 rounded-lg border p-1"
						>
							{npc.id}
							<img src="/icons/copy-content.svg" width={20} height={20} alt="Copy" />
						</button>
					</td>
					<td class="align-middle">{npc.name}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
