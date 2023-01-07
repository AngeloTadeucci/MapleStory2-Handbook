<script lang="ts">
	type ItemImageProp = {
		icon_path: string;
		name: string;
		rarity: number;
		min_count?: number;
		max_count?: number;
	};

	let image = '';
	export let { icon_path, rarity, name, min_count, max_count } = {} as ItemImageProp;
	const noImage = '/resource/sprites/disable overlay.png';
	const fixIconPath = () => `/${icon_path.split('/').slice(2).join('/')}`;

	const calcMinMaxCount = () => {
		if (min_count && max_count) {
			if (min_count !== max_count) {
				return `${min_count} ~ ${max_count}`;
			}
			return `${min_count}`;
		}
	};

	const handleMissingImage = () => {
		image = noImage;
	};

	$: image = icon_path === '' ? noImage : fixIconPath();
</script>

<div class="frame relative">
	<img
		src="/resource/sprites/slot_frame.png"
		width={64}
		height={64}
		alt="background"
		class="absolute mx-auto"
		style="left: 2px; top: 2px;"
	/>
	<img
		src="/resource/sprites/slot bg {rarity}.png"
		width={60}
		height={60}
		alt="background"
		class="absolute"
		style="left: 2px; top: 2px;"
	/>
	<img
		src={image}
		width={60}
		height={60}
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

<style>
	.frame {
		height: 60px;
		width: 60px;
	}
</style>
