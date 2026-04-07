<script lang="ts">
	import { musicPlayer, type Track } from '$lib/stores/musicPlayer.svelte';
	import { Play, Pause } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { formatDuration, bgmDisplayName, BgmCategory, BGM_CATEGORY_LABELS } from '$lib/helpers/bgm';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');
	let selectedCategory = $state('all');
	let sortBy = $state('name');

	$effect(() => {
		searchTerm = data.search;
		selectedCategory = data.category;
		sortBy = data.sort;
	});

	let searchTimeout: ReturnType<typeof setTimeout>;

	const categories = Object.values(BgmCategory);

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchTerm) params.set('search', searchTerm);
		if (selectedCategory !== 'all') params.set('category', selectedCategory);
		if (sortBy !== 'name') params.set('sort', sortBy);
		const qs = params.toString();
		goto(`/music${qs ? `?${qs}` : ''}`, { replaceState: true, keepFocus: true });
	}

	function onSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(applyFilters, 300);
	}

	function onFilterChange() {
		applyFilters();
	}

	function playTrack(track: Track) {
		if (isCurrentTrack(track)) {
			musicPlayer.togglePlay();
		} else {
			musicPlayer.play(track, data.tracks);
		}
	}

	function isCurrentTrack(track: Track): boolean {
		return musicPlayer.currentTrack?.id === track.id;
	}
</script>

<svelte:head>
	<title>MS2 Handbook - Soundtrack</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
	<h1 class="mb-4 text-4xl font-bold">Soundtrack</h1>

	<input
		type="text"
		placeholder="Search 🔎"
		class="input w-1/2 px-4 py-2 lg:w-1/3 bg-surface-700 text-surface-50 border-transparent placeholder:text-surface-400"
		bind:value={searchTerm}
		oninput={onSearchInput}
	/>

	<div class="mt-3 flex items-center gap-3">
		<select
			bind:value={selectedCategory}
			onchange={onFilterChange}
			class="input px-3 py-2 bg-surface-700 text-surface-50 border-transparent"
		>
			{#each categories as cat}
				<option value={cat}>{BGM_CATEGORY_LABELS[cat]}</option>
			{/each}
		</select>

		<select
			bind:value={sortBy}
			onchange={onFilterChange}
			class="input px-3 py-2 bg-surface-700 text-surface-50 border-transparent"
		>
			<option value="name">Sort: Name</option>
			<option value="duration">Sort: Longest</option>
			<option value="duration-asc">Sort: Shortest</option>
		</select>
	</div>

	<p class="mt-4 mb-2 text-sm text-surface-400">
		{data.tracks.length} track{data.tracks.length !== 1 ? 's' : ''}
	</p>

	<!-- Header row -->
	<div class="flex flex-row border-b border-gray2">
		<div class="w-16 py-4 pr-6 text-left"></div>
		<div class="flex-1 py-4 pr-6 text-left">Name</div>
		<div class="w-20 py-4 pr-4 text-right">Duration</div>
	</div>

	{#if data.tracks.length === 0}
		<div class="flex items-center justify-center">
			<h2 class="my-10">No tracks found</h2>
		</div>
	{/if}

	{#each data.tracks as track (track.id)}
		<button
			onclick={() => playTrack(track)}
			class="unstyled flex w-full items-center border-b border-gray2 last:border-none transition-colors
				{isCurrentTrack(track) ? 'bg-primary-500/10' : 'hover:preset-tonal'}"
		>
			<div class="flex w-16 shrink-0 items-center justify-center py-4 pr-6">
				{#if isCurrentTrack(track) && musicPlayer.isPlaying}
					<Pause size={20} class="text-primary-400" />
				{:else}
					<Play size={20} class={isCurrentTrack(track) ? 'text-primary-400' : 'text-surface-400'} />
				{/if}
			</div>
			<div class="flex-1 truncate py-4 pr-6 text-left {isCurrentTrack(track) ? 'text-primary-300' : ''}">
				{bgmDisplayName(track.name)}
			</div>
			<div class="w-20 shrink-0 py-4 pr-4 text-right text-sm text-surface-400">
				{formatDuration(track.durationSeconds)}
			</div>
		</button>
	{/each}
</div>
