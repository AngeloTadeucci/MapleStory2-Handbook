<script>
	import { url } from '$lib/helpers/addBasePath';
	let menus = [
		{ name: 'Items', path: '/items' },
		{ name: 'NPCs', path: '/npcs' }
		// { name: 'Maps', path: '/maps' },
		// { name: 'Quests', path: '/quests' },
		// { name: 'Trophies', path: '/trophies' },
		// { name: 'Dungeons', path: '/dungeons' },
		// { name: 'Skills', path: '/skills' },
		// { name: 'Dyes', path: '/dyes' },
	];
</script>

<nav class="flex h-32 items-center bg-header-black px-12 py-6">
	<a href={url('/')}>
		<img
			src={url('/logo.png')}
			width={112}
			height={68}
			alt="Logo MapleStory2 Handbook"
			title="MapleStory2 Handbook"
			class="priority"
		/>
	</a>

	<div class="ml-12 mr-12 h-20 w-px border-l border-gray-600" />

	{#each menus as menu, index}
		<div class="flex items-center">
			<a href={url(menu.path)} class="px-2 py-2 font-sans font-bold text-white">{menu.name}</a>
			{#if index !== menus.length - 1}
				<div class="ml-12 mr-12 h-14 w-px border-l border-gray-600" />
			{/if}
		</div>
	{/each}

	<div class="ml-auto flex items-center">
		<div class="ml-12 mr-12 h-20 w-px border-l border-gray-600" />

		<a href="https://ko-fi.com/angelotadeucci" target="_blank" rel="noreferrer" title="Ko-fi">
			<img src={url('/kofi.png')} width={109} height={45} alt="Ko-fi" class="cursor-pointer" />
		</a>
	</div>
</nav>

<style>
	nav {
		box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
		grid-row: 1;
	}
</style>
