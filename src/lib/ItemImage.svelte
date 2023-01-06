<script lang="ts">
	import { onMount } from 'svelte';

	type ItemImageProp = {
		icon_path: string;
		name: string;
		rarity: number;
		min_count?: number;
		max_count?: number;
		small?: boolean;
	};

	let image = '';
	export let { icon_path, rarity, name, small, min_count, max_count } = {} as ItemImageProp;

	const calcMinMaxCount = () => {
		if (min_count && max_count) {
			if (min_count !== max_count) {
				return `${min_count} ~ ${max_count}`;
			}
			return `${min_count}`;
		}
	};

	onMount(() => {
		image = `/${icon_path.split('/').slice(2).join('/')}`;
	});

	function handleMissingImage() {
		image = '/Resource/sprites/disable overlay.png';
	}
</script>

<div class="relative" style={small ? 'height: 60px; width: 60px;' : 'height: 100px; width: 100px;'}>
	<img
		src="/resource/sprites/slot_frame.png"
		width={64}
		height={64}
		alt="background"
		class="absolute mx-auto"
		style="left: 2px; top: 2px;"
	/>
	<img
		src={`/resource/sprites/slot bg ${rarity}.png`}
		width={60}
		height={60}
		alt="background"
		class="absolute"
		style="left: 2px; top: 2px;"
	/>
	<img
		src={image}
		width={small ? 60 : 100}
		height={small ? 60 : 100}
		alt={name}
		class="absolute"
		style="left: 2px; top: 2px;"
		on:error={handleMissingImage}
	/>
	{#if min_count}
		<p class="absolute right-0 bottom-0">
			{calcMinMaxCount()}
		</p>
	{/if}
</div>
