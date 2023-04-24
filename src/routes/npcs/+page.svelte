<script lang="ts">
	import CopyId from '$lib/components/CopyId.svelte';
	import NpcImage from '$lib/components/NpcImage.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import type { SearchNpc } from 'src/types/Npc';
	import { afterUpdate, beforeUpdate, onMount } from 'svelte';
	import debounce from 'lodash.debounce';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import IntersectionObserver from 'svelte-intersection-observer';
	import Spinner from '$lib/components/Spinner.svelte';

	let searchPage: number = 0;
	let searchTerm = $page.url.searchParams.get('search') || '';

	let lastSearchTerm = searchTerm;

	let data: SearchNpc[] = [];
	let lastBatch: SearchNpc[] = [];

	async function fetchData() {
		const response = await fetch(url(`/api/npcs?search=${searchTerm}&page=${searchPage}&limit=20`));

		const npcs = await response.json();

		if (npcs.length === 0) {
			lastBatch = [];
			return;
		}

		// check if items content is the same as the data
		if (data.length > 0 && data[data.length - 1].id === npcs[npcs.length - 1].id) {
			return;
		}

		if (lastSearchTerm !== searchTerm) {
			data = [];
		}

		lastBatch = npcs;
		data = [...data, ...npcs];
		lastSearchTerm = searchTerm;
	}

	onMount(() => {
		// load first batch onMount
		fetchData();
	});

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
	<title>MS2 Handbook - NPCs</title>
</svelte:head>

<div class="main-container mx-4 rounded-xl bg-zinc-800 px-5 pt-2 pb-40 lg:m-auto lg:w-3/4">
	<h1 class="mb-4 text-4xl font-bold">NPCs</h1>
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
	</div>
	{#each data as npc}
		<a
			class="flex cursor-pointer items-center border-b border-blue-ascent last:border-none hover:bg-zinc-800"
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
