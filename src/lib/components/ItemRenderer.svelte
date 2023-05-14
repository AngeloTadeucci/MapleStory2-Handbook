<script script lang="ts">
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { url } from '../helpers/addBasePath';
	import { ProgressRadial, RangeSlider } from '@skeletonlabs/skeleton';
	import type Item from '$lib/types/Item';

	type RendererProps = {
		item: Item;
	};
	export let { item } = {} as RendererProps;

	const gltfUrl = env.PUBLIC_NODE_ENV === 'development' ? '/gltf/' : env.PUBLIC_MODELS_URL;
	const iconPath = url(`/${item.icon_path.split('/').slice(2).join('/')}`);

	let loadingGltf = true;
	let orientation = '0deg 0deg 90deg';
	let cameraTarget = '';
	let customOrbit = '';

	onMount(async () => {
		try {
			const response = await fetch(`${gltfUrl}${item.kfms[0]}/${item.kfms[0]}.gltf`, {
				method: 'HEAD'
			});

			if (!response.ok) {
				loadingGltf = false;
				return;
			}
		} catch {}
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
	<model-viewer
		src="{gltfUrl}{item.kfms[0]}/{item.kfms[0]}.gltf"
		alt={item.name}
		camera-controls
		{...{ cameraTarget, customOrbit, orientation }}
		autoplay
		max-field-of-view="70deg"
		touch-action="pan-y"
		interaction-prompt="none"
		style={`width: 550px; height: 760px; --iconPath: url(${iconPath});`}
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
