<script script lang="ts">
	import { env } from '$env/dynamic/public';
	import type { Npc } from '$lib/types/Npc';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import { url } from '../helpers/addBasePath';

	type RendererProps = {
		npc: Npc;
		customStyle?: string;
		advancedControls?: boolean;
	};
	export let { npc, customStyle, advancedControls = false } = {} as RendererProps;

	const gltfUrl = env.PUBLIC_NODE_ENV === 'development' ? '/gltf/' : env.PUBLIC_MODELS_URL;
	const iconPath = url(`/${npc.portrait.split('/').slice(2).join('/')}`);

	let validAnimations: string[] = [];
	let selectedAnimation = '';
	let loadingGltf = true;
	let orientation = '';
	let cameraTarget = '';
	let customOrbit = '';

	onMount(async () => {
		orientation = '0deg -90deg 0deg';
		selectedAnimation = npc.kfm;

		try {
			const response = await fetch(`${gltfUrl}${npc.kfm}/${npc.kfm}.gltf`, {
				method: 'HEAD'
			});
			if (!response.ok) {
				loadingGltf = false;
				return;
			}

			await Promise.all(
				npc.animations.map(async (animation: any) => {
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

	export const ssr = false;
</script>

<svelte:head>
	<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js">
	</script>
</svelte:head>

{#if loadingGltf}
	<div class="flex items-center justify-center">
		<ProgressRadial width="w-32" />
	</div>
{:else}
	<div class="mx-4 mt-2 flex items-center gap-5">
		<div class="flex w-1/2 flex-col">
			<span class="font-bold">Change animation</span>
			<select class="select mb-2 border border-gray2 p-2" bind:value={selectedAnimation}>
				<option value={npc.kfm}>Default</option>
				{#each validAnimations as animation}
					<option value={animation}>{animation}</option>
				{/each}
			</select>
		</div>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<button class="button absolute right-5 top-5 z-10">
			<img
				src={url('/icons/open_in_new.svg')}
				alt="Open in new tab"
				title="Open in new tab"
				on:click={() => window.open(`/npcs/${npc.id}/model`)}
			/>
		</button>
	</div>
	<model-viewer
		src="{gltfUrl}{npc.kfm}/{selectedAnimation}.gltf"
		alt={npc.name}
		camera-controls
		{...{ cameraTarget, customOrbit, orientation }}
		autoplay
		max-field-of-view="70deg"
		touch-action="pan-y"
		interaction-prompt="none"
		style={customStyle ?? `width: 550px; height: 760px; --iconPath: url(${iconPath});`}
	/>
{/if}

<style>
	#lazy-load-poster {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background-image: var(--iconPath);
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
	}
	#button-load {
		background-image: url('/icons/file_download.svg');
		background-repeat: no-repeat;
		background-size: 24px 24px;
		background-position: 6% 50%;
		background-color: #000;
		color: white;
		cursor: pointer;
		border-radius: 6px;
		display: inline-block;
		padding: 10px 18px 9px 40px;
		font-weight: 500;
		box-shadow: 0 0 8px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.25);
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate3d(-50%, -50%, 0);
		z-index: 100;
	}
</style>
