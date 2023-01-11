<script lang="ts">
	import ItemDetails from '$lib/components/item/ItemDetails.svelte';
	import Renderer from '$lib/components/Renderer.svelte';
	import type Item from 'src/types/Item';
	import type { PageData } from './$types';

	export let data: PageData;
	const { item: resultItem, boxContent } = data.props;

	const item = resultItem as unknown as Item;

	let loadModel: boolean;
	let glbExists: boolean;

	$: {
		if (item && loadModel) {
			fetch(`/glb/${item.glb[0].toLowerCase()}`).then((x) => {
				if (x.status === 404) {
					glbExists = false;
				} else {
					glbExists = true;
				}
			});
		}
	}
</script>

<div>
	<div class="flex items-center gap-1">
		<p>Item</p>
		&gt;
		<button
			on:click={(e) => {
				navigator.clipboard.writeText(item.id.toString());
				e.stopPropagation();
			}}
			title="Copy ID"
			class="flex items-center justify-center gap-2 rounded-lg border p-1"
		>
			{item.id}
			<img src="/icons/copy-content.svg" width={20} height={20} alt="Copy" />
		</button>
	</div>
	<div class="content mt-3 rounded-lg border p-6">
		<p class="text-4xl">{item.name}</p>
		<div class="flex flex-row gap-16">
			<ItemDetails {item} />
			{#if item.glb.length > 0}
				<div class="model">
					{#if !loadModel}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<p
							class="cursor-pointer"
							on:click={() => {
								loadModel = true;
							}}
						>
							Click to load model...
						</p>
					{/if}
					{#if loadModel && !glbExists}
						Model not found.
					{/if}
					{#if loadModel && glbExists}
						<Renderer model={item.glb[0].toLowerCase()} item={true} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.content {
		background: #2b2c2e;
		border-color: #37393d;
		min-height: 90vh;
	}
</style>
