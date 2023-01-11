<script lang="ts">
	type NpcImageProp = {
		portrait: string;
		name: string;
	};

	let image = '';
	export let { portrait, name } = {} as NpcImageProp;
	const noImage = '/resource/sprites/disable overlay.png';
	const fixIconPath = () => `/${portrait.toLocaleLowerCase().split('/').slice(2).join('/')}`;

	const handleMissingImage = () => {
		image = noImage;
	};

	$: image = portrait === '' ? noImage : fixIconPath();
</script>

<img src={image} width={60} height={60} alt={name} on:error={handleMissingImage} />
