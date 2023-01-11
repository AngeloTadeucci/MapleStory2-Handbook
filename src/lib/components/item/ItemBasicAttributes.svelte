<script lang="ts">
	import type { StatList, StatRangeList } from 'src/types/Item';
	import itemHelper from '../../helpers/itemHelper';

	export let constantsStats: StatList[];
	export let staticStats: StatRangeList[];
	export let itemSlot: number;

	let constantWithoutDefaultStat: StatList[];

	if (itemHelper.isArmor(itemSlot)) {
		constantWithoutDefaultStat = constantsStats.filter((x) => x.Item1.ItemAttribute !== 20);
	}
	if (itemHelper.isWeapon(itemSlot)) {
		constantWithoutDefaultStat = constantsStats.filter(
			(x) => x.Item1.ItemAttribute !== 27 && x.Item1.ItemAttribute !== 28
		);
	}
	if (itemHelper.isAccessory(itemSlot)) {
		constantWithoutDefaultStat = constantsStats.filter((x) => x.Item1.ItemAttribute !== 4);
	}
</script>

<div>
	{#if constantWithoutDefaultStat.length > 0}
		<p class="mt-2">Basic Attributes</p>

		<ul class="ml-1">
			{#each constantWithoutDefaultStat as stat}
				<li class="mt-1">{stat.Item2.replace('{0}', String(stat.Item1.Value))}</li>
			{/each}
			{#each staticStats as stat}
				<li class="mt-1">
					{stat.Item2.replace('{0}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	ul {
		list-style-type: disc;
		list-style-position: inside;
	}
</style>
