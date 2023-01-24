<script lang="ts">
	import { env } from '$env/dynamic/public';

	import CopyId from '$lib/components/CopyId.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import type { Npc } from 'src/types/Npc';
	import Renderer from '$lib/components/Renderer.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import NpcDetails from '$lib/components/npc/NpcDetails.svelte';

	export let data: PageData;

	const npc = data.props.npc as unknown as Npc;

	let loadingGltf = true;

	let validAnimations: string[] = [];
	let selectedAnimation = '';
	let animationSpeed: number = 1;

	const gltfUrl = env.PUBLIC_NODE_ENV === 'development' ? '/gltf/' : env.PUBLIC_MODELS_URL;

	async function incrementViewCount() {
		await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

		try {
			await fetch(`/api/npcs?id=${npc.id}`, {
				method: 'POST'
			});
		} catch {}
	}

	onMount(async () => {
		if (!npc) {
			return;
		}

		incrementViewCount();
		if (npc.kfm.length <= 0) {
			loadingGltf = false;
			return;
		}

		try {
			const response = await fetch(`${gltfUrl}${npc.kfm}/${npc.kfm}.gltf`, {
				method: 'HEAD'
			});
			if (!response.ok) {
				loadingGltf = false;
				return;
			}

			selectedAnimation = npc.kfm;

			await Promise.all(
				npc.animations.map(async (animation) => {
					const response = await fetch(`${gltfUrl}${npc.kfm}/${animation}.gltf`);

					if (response.ok) {
						validAnimations.push(animation);
					}
				})
			);
		} catch {}
		// order animations alphabetically
		validAnimations.sort((a, b) => a.localeCompare(b));
		loadingGltf = false;
	});
</script>

<svelte:head>
	<title>MS2 Handbook - {npc.name}</title>
	<!-- Open graph -->
	<meta property="og:title" content={npc.name} />
	<meta property="og:description" content={npc.name} />
	<meta property="og:image" content={url(`/${npc.portrait.split('/').slice(2).join('/')}`)} />
	<meta property="og:url" content={url(`/npcs/${npc.id}`)} />
</svelte:head>

<div class="grid justify-center">
	<div class="ml-4 flex items-center gap-1">
		<p>NPC</p>
		&gt;
		<CopyId id={npc.id} />
	</div>
	<div class="main-container mx-4 mt-3 rounded-xl bg-zinc-800 p-6 pb-40">
		<p class="text-4xl">{npc.title ?? npc.title} {npc.name}</p>
		<div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row">
			<NpcDetails {npc} />
			{#if npc.kfm.length > 0 && !loadingGltf && selectedAnimation}
				<div class="flex items-center gap-5">
					<select
						class="mb-2 rounded-md border border-blue-ascent p-2"
						bind:value={selectedAnimation}
					>
						<option value={npc.kfm}>Default</option>
						{#each validAnimations as animation}
							<option value={animation}>{animation}</option>
						{/each}
					</select>
					<!-- {#if validAnimations.length > 0}
						<div class="flex flex-col ">
							Animation Speed: {animationSpeed}
							<input type="range" min="0.5" max="5.0" step="0.1" bind:value={animationSpeed} />
						</div>
					{/if} -->
				</div>

				<div class="model px-3 pt-2">
					<Renderer
						cover={npc.portrait}
						model={npc.kfm}
						name={npc.name}
						{selectedAnimation}
						{animationSpeed}
					/>
					<img
						src={url('/item/mouse_controls.png')}
						class="absolute bottom-5 left-5 hidden md:block"
						alt="Mouse Controls"
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.model {
		position: relative;
		background-image: url('/item/render_box.png');
		width: 575px;
		height: 799px;
	}
</style>
