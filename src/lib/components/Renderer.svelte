<script lang="ts">
	import { env } from '$env/dynamic/public';
	export let model: string;
	const glbUrl = env.PUBLIC_NODE_ENV === 'development' ? '/glbs/' : env.PUBLIC_MODELS_URL;
</script>

<svelte:head>
	<script
		type="module"
		src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
	></script>
</svelte:head>

<model-viewer src="{glbUrl}{model}" camera-controls touch-action="pan-y" />
