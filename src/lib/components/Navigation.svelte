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
	let open = false;
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

	<div class="hidden md:flex">
		<div class="ml-12 mr-12 h-20 w-px border-l border-gray-600" />

		{#each menus as menu, index}
			<div class="flex items-center">
				<a href={url(menu.path)} class="px-2 py-2 font-sans font-bold text-white">{menu.name}</a>
				{#if index !== menus.length - 1}
					<div class="ml-12 mr-12 h-14 w-px border-l border-gray-600" />
				{/if}
			</div>
		{/each}
	</div>

	<div class="ml-auto hidden items-center md:flex">
		<div class="ml-12 mr-12 h-20 w-px border-l border-gray-600" />

		<a href="https://ko-fi.com/angelotadeucci" target="_blank" rel="noreferrer" title="Ko-fi">
			<img src={url('/kofi.png')} width={109} height={45} alt="Ko-fi" class="cursor-pointer" />
		</a>
	</div>

	<div class="ml-auto block md:hidden">
		<button
			class="flex items-center rounded border border-gray-600 px-3 py-2 text-white "
			on:click={() => (open = !open)}
		>
			<svg class="h-3 w-3 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
				<title>Menu</title>
				<path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
			</svg>
		</button>
	</div>

	{#if open}
		<div class="fixed inset-0 z-10 bg-header-black px-12 pb-6">
			<div class="flex h-32 items-center">
				<a href={url('/')} on:click={() => (open = false)}>
					<img
						src={url('/logo.png')}
						width={112}
						height={68}
						alt="Logo MapleStory2 Handbook"
						title="MapleStory2 Handbook"
						class="priority"
					/>
				</a>
				<button
					class="ml-auto flex items-center rounded border border-gray-600 px-3 py-2 text-white "
					on:click={() => (open = !open)}
				>
					<svg class="h-3 w-3 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
						<title>Close</title>
						<path
							fill-rule="evenodd"
							d="M10 10L3.293 3.293a1 1 0 111.414-1.414L11 8.586l6.707-6.707a1 1 0 111.414 1.414L12.414 10l6.707 6.707a1 1 0 01-1.414 1.414L11 11.414l-6.707 6.707a1 1 0 01-1.414-1.414L9.586 10z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
			<div class="mt-5 flex h-4/5 flex-col items-center">
				{#each menus as menu}
					<a
						href={url(menu.path)}
						class="px-2 py-2 font-sans font-bold text-white"
						on:click={() => (open = false)}>{menu.name}</a
					>
				{/each}
				<a
					href="https://ko-fi.com/angelotadeucci"
					target="_blank"
					rel="noreferrer"
					title="Ko-fi"
					class="mt-auto"
				>
					<img src={url('/kofi.png')} width={109} height={45} alt="Ko-fi" class="cursor-pointer" />
				</a>
			</div>
		</div>
	{/if}
</nav>

<style>
	nav {
		box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
		grid-row: 1;
	}
</style>
