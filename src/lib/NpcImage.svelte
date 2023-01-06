<script lang="ts">
	import { onMount } from 'svelte';

	type NpcImageProp = {
		portrait_path: string;
		name: string;
	};

	let image = '';
	export let { portrait_path, name } = {} as NpcImageProp;

	onMount(() => {
		image = `/${portrait_path.split('/').slice(2).join('/')}`;
	});

	function handleMissingImage() {
		image = '/resource/sprites/disable overlay.png';
	}
</script>

<img src={image} width={60} height={60} alt={name} on:error={handleMissingImage} />
