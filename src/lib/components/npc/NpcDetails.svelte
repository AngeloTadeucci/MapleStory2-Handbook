<script lang="ts">
	import type { Npc } from 'src/types/Npc';
	import ItemListContainer from '../item/ItemListContainer.svelte';
	import NpcImage from '../NpcImage.svelte';

	export let npc: Npc;
	// todo:
	// - stats
	// - skills
</script>

<ItemListContainer classname="lg:mt-0">
	<div>
		<div class="mb-2">
			<NpcImage name={npc.name} portrait={npc.portrait} />
		</div>
		<div class="flex flex-col">
			{#if npc.npc_type === 0}
				<div>
					Level: {npc.level}
				</div>
			{/if}
			{#if npc.class_name && npc.npc_type === 0}
				<div>
					Type: {npc.class_name}
				</div>
			{/if}
			{#if npc.race}
				<div>
					Category: {npc.race}
				</div>
			{/if}
			{#if npc.shop_id}
				<p>
					Shop ID: {npc.shop_id}
				</p>
			{/if}
			{#if npc.field_metadata?.length > 0}
				<hr class="my-4" />
				<div class="flex flex-col ">
					{#if npc.npc_type === 0}
						Main Habitat:
					{:else}
						Found in:
					{/if}
					<div>
						{#each npc.field_metadata as field, index}
							<span class="underline">
								{field.Item1}
							</span>
							{#if index < npc.field_metadata.length - 1}
								<span class="-ml-1">, </span>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</ItemListContainer>
