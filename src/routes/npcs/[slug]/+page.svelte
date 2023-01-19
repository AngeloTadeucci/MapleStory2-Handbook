<script lang="ts">
	import { env } from '$env/dynamic/public';

	import CopyId from '$lib/components/CopyId.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import type { Npc } from 'src/types/Npc';
	import Renderer from '$lib/components/Renderer.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	export let data: PageData;

	const npc = data.props.npc as unknown as Npc;
	let glbExists: boolean;

	const glbUrl = env.PUBLIC_NODE_ENV === 'development' ? '/glbs/' : env.PUBLIC_MODELS_URL;

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
		if (npc.glb.length <= 0) {
			return;
		}

		try {
			const response = await fetch(`${glbUrl}${npc.glb}`, {
				method: 'HEAD'
			});
			if (response.status === 404) {
				glbExists = false;
			} else {
				glbExists = true;
			}
		} catch {}
	});
</script>

<svelte:head>
	<title>MS2 Handbook - {npc.name}</title>
	<!-- Open graph -->
	<meta property="og:title" content="MapleStory 2 Handbook" />
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
	<div class="content mx-4 mt-3 rounded-lg border p-6">
		<p class="text-4xl">{npc.name}</p>
		<div class="flex flex-row flex-wrap justify-start gap-16 gap-y-2">
			{#if npc.glb.length > 0 && glbExists}
				<div class="model mt-7 flex items-center justify-center px-3 pt-2">
					<Renderer cover={npc.portrait} model={npc.glb} name={npc.name} />
					<img
						src={url('/item/mouse_controls.png')}
						class="absolute bottom-5 left-5 hidden md:block"
						alt="Mouse Controls"
					/>
				</div>
			{:else}
				Model not found
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.content {
		background: #2b2c2e;
		border-color: #37393d;
		min-height: fit-content;
	}

	.model {
		position: relative;
		background-image: url('/item/render_box.png');
		width: 575px;
		height: 799px;
	}
</style>
