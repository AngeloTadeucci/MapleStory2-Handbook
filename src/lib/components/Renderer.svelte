<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { url } from '$lib/helpers/addBasePath';
	type RendererProps = {
		model: string;
		cover: string;
		name: string;
		customOrbit?: string;
		cameraTarget?: string;
		orientation?: string;
	};
	export let { model, cover, name, customOrbit, cameraTarget, orientation } = {} as RendererProps;
	if (!orientation) {
		orientation = '0deg -90deg 0deg';
	}

	const glbUrl = env.PUBLIC_NODE_ENV === 'development' ? '/glbs/' : env.PUBLIC_MODELS_URL;
	const iconPath = url(`/${cover.split('/').slice(2).join('/')}`);
</script>

<svelte:head>
	<script
		type="module"
		src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
	></script>
</svelte:head>

<model-viewer
	src="{glbUrl}{model}"
	alt={name}
	camera-controls
	{...{ cameraTarget, customOrbit, orientation }}
	reveal="manual"
	touch-action="pan-y"
	style="width: 550px; height: 760px; --iconPath: url({iconPath});"
>
	<div id="lazy-load-poster" slot="poster" />
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		id="button-load"
		slot="poster"
		on:click={(e) => {
			// @ts-ignore
			document.querySelector('model-viewer')?.dismissPoster();
		}}
	>
		Load 3D Model
	</div>
</model-viewer>

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
