<script lang="ts">
	import { env } from '$env/dynamic/public';
	import ItemDetails from '$lib/components/item/ItemDetails.svelte';
	import ItemBoxContent from '$lib/components/item/ItemBoxContent.svelte';
	import Renderer from '$lib/components/Renderer.svelte';
	import { url } from '$lib/helpers/addBasePath';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import CopyId from '$lib/components/CopyId.svelte';
	import type Item from '../../../types/Item';
	import type { ItemBox } from '../../../types/ItemBox';

	export let data: PageData;
	const { item: resultItem, boxContent: resultBoxContent } = data.props;

	const item = resultItem as unknown as Item;
	const boxContent = resultBoxContent as unknown as ItemBox[];

	let gltfExists: boolean;

	const gltfUrl = env.PUBLIC_NODE_ENV === 'development' ? '/gltf/' : env.PUBLIC_MODELS_URL;

	async function incrementViewCount() {
		await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

		try {
			await fetch(`/api/items?id=${item.id}`, {
				method: 'POST'
			});
		} catch {}
	}

	onMount(async () => {
		if (!item) {
			return;
		}

		incrementViewCount();
		if (item.kfms.length <= 0) {
			return;
		}

		try {
			const response = await fetch(`${gltfUrl}${item.kfms[0]}/${item.kfms[0]}.gltf`, {
				method: 'HEAD'
			});
			if (response.status === 404) {
				gltfExists = false;
			} else {
				gltfExists = true;
			}
		} catch {}
	});
</script>

<svelte:head>
	<title>MS2 Handbook - {item.name}</title>
	<!-- Open graph -->
	<meta property="og:title" content={item.name} />
	<meta property="og:image" content={url(`/${item.icon_path.split('/').slice(2).join('/')}`)} />
	<meta property="og:url" content={url(`/items/${item.id}`)} />
</svelte:head>

<div class="grid justify-center">
	<div class="ml-4 flex items-center gap-1">
		<p>Item</p>
		&gt;
		<CopyId id={item.id} />
	</div>
	<div class="main-container mx-4 mt-3 rounded-xl bg-zinc-800 p-6 pb-40">
		<p class="text-4xl">{item.name}</p>
		<div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row">
			<ItemDetails {item} />
			{#if item.kfms.length > 0 && gltfExists}
				<div
					class="model mt-7 flex items-center justify-center px-3 pt-2 lg:h-[799px] lg:w-[575px]"
				>
					<Renderer
						cover={item.icon_path}
						model={item.kfms[0]}
						name={item.name}
						orientation="90deg 0deg 90deg"
					/>
					<img
						src={url('/item/mouse_controls.png')}
						class="absolute bottom-5 left-5 hidden md:block"
						alt="Mouse Controls"
					/>
				</div>
			{/if}
			{#if boxContent.length > 0}
				<ItemBoxContent {boxContent} />
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.model {
		position: relative;
		background-image: url('/item/render_box.png');
		background-size: cover;
		background-repeat: no-repeat;
	}
</style>
