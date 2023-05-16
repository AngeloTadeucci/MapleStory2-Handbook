<script lang="ts">
	import CopyId from '$lib/components/CopyId.svelte';
	import NpcRenderer from '$lib/components/NpcRenderer.svelte';
	import NpcDetails from '$lib/components/npc/NpcDetails.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import type { Npc } from '$lib/types/Npc';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { env } from '$env/dynamic/public';

	export let data: PageData;

	const npc = data.props.npc as unknown as Npc;

	let gltfExists: boolean;

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
			return;
		}
		try {
			const response = await fetch(`${gltfUrl}${npc.kfm}/${npc.kfm}.gltf`, {
				method: 'HEAD'
			});
			if (response.status === 404) {
				gltfExists = false;
			} else {
				gltfExists = true;
			}
		} catch {}
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

<div class="mt-5 grid justify-center">
	<div class="ml-4 flex items-center gap-1">
		<a href="/npcs" class="unstyled underline">NPC</a>
		&gt;
		<CopyId id={npc.id} />
	</div>
	<div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
		<h1>{npc.title ?? npc.title} {npc.name}</h1>
		<div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row">
			<NpcDetails {npc} />
			{#if npc.kfm.length > 0 && gltfExists}
				<div>
					<div class="model px-3 pt-2">
						<NpcRenderer {npc} />
						<img
							src={url('/item/mouse_controls.png')}
							class="absolute bottom-5 left-5 hidden md:block"
							alt="Mouse Controls"
						/>
					</div>
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
