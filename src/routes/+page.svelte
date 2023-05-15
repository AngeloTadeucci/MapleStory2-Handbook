<script lang="ts">
	import ItemImage from '../lib/components/ItemImage.svelte';
	import NpcImage from '../lib/components/NpcImage.svelte';
	import { url } from '../lib/helpers/addBasePath';

	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>MapleStory 2 Handbook</title>
</svelte:head>

<div
	class="home-container flex h-full flex-col items-start justify-center gap-2 rounded-xl bg-surface-500 py-4 md:flex-row md:gap-3 lg:m-auto lg:flex-row lg:gap-10 xl:w-3/4"
>
	<div
		class="main-container flex w-full flex-col items-center justify-center rounded-md px-5 pb-5 lg:mx-5 lg:w-1/2 lg:justify-center"
	>
		<h1 class="mb-5 mt-3 text-2xl">Most Viewed Items</h1>
		<div class="flex w-full flex-col lg:w-3/4">
			{#each data.props.mostViewedItems as item}
				<div
					class="w-full border-b border-primary-800 py-3 last:border-none hover:bg-surface-hover-token"
				>
					<a class="unstyled flex flex-row items-center" href={url(`/items/${item.id}`)}>
						<ItemImage icon_path={item.icon_path} name={item.name} rarity={item.rarity} />
						<p class="ml-8 line-clamp-1 w-1/2 lg:w-3/4">{item.name}</p>
					</a>
				</div>
			{/each}
		</div>
	</div>

	<div
		class="main-container flex w-full flex-col items-center justify-center rounded-md px-5 pb-5 lg:mx-5 lg:w-1/2 lg:justify-center"
	>
		<h1 class="mb-5 mt-3 text-2xl">Most Viewed NPCs</h1>
		<div class="flex w-full flex-col lg:w-3/4">
			{#each data.props.mostViewedNpcs as npc}
				<div
					class="w-full border-b border-primary-800 py-3 last:border-none hover:bg-surface-hover-token"
				>
					<a class="unstyled flex flex-row items-center" href={url(`/npcs/${npc.id}`)}>
						<NpcImage portrait={npc.portrait} name={npc.name} />
						<p class="ml-8 line-clamp-1 w-1/2 lg:w-3/4">{npc.name}</p>
					</a>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.home-container {
		background-image: url('/home_background.png');
		background-size: auto;
		background-repeat: repeat-x;
		background-position: bottom;
		background-blend-mode: multiply;
	}
</style>
