<script lang="ts">
	import CopyId from '$lib/components/CopyId.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import type { Npc } from 'src/types/Npc';
	import Renderer from '$lib/components/Renderer.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const npc = data.props.npc as unknown as Npc;
</script>

<svelte:head>
	<title>MS2 Handbook - {npc.name}</title>
</svelte:head>

<div class="flex items-center gap-1">
	<p>Npc</p>
	&gt;
	<CopyId id={npc.id} />
</div>
<div class="content mt-3 rounded-lg border p-6">
	<p class="text-4xl">{npc.name}</p>
	<div class="flex flex-row flex-wrap justify-start gap-16 gap-y-2">
		{#if npc.glb.length > 0}
			<div class="model mt-7 flex items-center justify-center px-3 pt-2">
				<Renderer cover={npc.portrait} model={npc.glb} name={npc.name} />
				<img
					src={url('/item/mouse_controls.png')}
					class="absolute bottom-5 left-5 hidden md:block"
					alt="Mouse Controls"
				/>
			</div>
		{/if}
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
