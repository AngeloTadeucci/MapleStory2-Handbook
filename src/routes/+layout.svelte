<script>
	import { url } from '$lib/helpers/addBasePath';
	import '../app.css';
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

<div class="flex h-32 items-center bg-header-black px-12 py-6">
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

	<div class="ml-12 mr-12 h-20 w-px border border-gray-600" />

	{#each menus as menu, index}
		<div class="flex items-center">
			<a href={url(menu.path)} class="px-2 py-2 font-sans font-bold text-white">{menu.name}</a>
			{#if index !== menus.length - 1}
				<div class="ml-12 mr-12 h-14 w-px border border-gray-600" />
			{/if}
		</div>
	{/each}

	<div class="ml-auto flex items-center">
		<div class="ml-12 mr-12 h-20 w-px border border-gray-600" />

		<a href="https://ko-fi.com/angelotadeucci" target="_blank" rel="noreferrer" title="Ko-fi">
			<img src={url('/kofi.png')} width={109} height={45} alt="Ko-fi" class="cursor-pointer" />
		</a>
	</div>
</div>

<div class="mt-10 xs:mx-10 xl:mx-60">
	<slot />
</div>

<footer class="mt-6 flex flex-1 flex-col items-center justify-center border-t px-8">
	<a href={url('/')}>MapleStory2 Handbook</a>
	<p class="mt-12 flex flex-row">
		Made by
		<a class="mx-1 underline" href="https://github.com/AngeloTadeucci">Tadeucci</a>
		- 2023
	</p>
	<p>
		Source code on <a
			class="underline"
			href="https://github.com/AngeloTadeucci/Maple2Codex-FrontEnd-Svelte">GitHub</a
		>
	</p>
</footer>
