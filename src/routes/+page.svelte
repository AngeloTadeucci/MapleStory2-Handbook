<script lang="ts">
	import ItemImage from '$lib/components/ItemImage.svelte';
	import NpcImage from '$lib/components/NpcImage.svelte';

	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<base href="/handbook" />
	<title>MS2 Handbook</title>
</svelte:head>

<div
	class="m-auto flex flex-col items-center justify-center gap-10 rounded-md py-2 xl:flex-row xl:px-10"
>
	<div
		class="flex w-3/4 flex-col items-center justify-center rounded-md border border-white pb-5  xl:w-1/2"
	>
		<h1 class="mb-5 text-2xl text-white">Most Viewed Items</h1>
		<div class="max-w-1/2 flex w-3/4 flex-col justify-center">
			{#each data.props.mostViewedItems as item}
				<div class="border-b border-white py-3 last:border-none hover:bg-zinc-800">
					<a class="flex flex-row items-center justify-between px-5" href="/items/{item.id}">
						<ItemImage icon_path={item.icon_path} name={item.name} rarity={item.rarity} />
						<p class="ml-8 text-white">{item.name}</p>
					</a>
				</div>
			{/each}
		</div>
	</div>

	<div
		class="flex w-3/4 flex-col items-center justify-center rounded-md border border-white pb-5 xl:w-1/2"
	>
		<h1 class="mb-5 text-2xl text-white">Most Viewed NPCs</h1>
		<div class="flex w-3/4 flex-col justify-center">
			{#each data.props.mostViewedNpcs as npc}
				<div class="border-b border-white py-3 last:border-none hover:bg-zinc-800">
					<a class="flex flex-row items-center justify-between" href="/npcs/{npc.id}">
						<NpcImage portrait={npc.portrait} name={npc.name} />
						<p class="ml-8 text-white">{npc.name}</p>
					</a>
				</div>
			{/each}
		</div>
	</div>
</div>
