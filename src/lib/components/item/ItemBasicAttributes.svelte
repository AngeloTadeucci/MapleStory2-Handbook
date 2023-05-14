<script lang="ts">
	import type { StatList, StatRangeList } from '../../types/Item';

	export let constantsStats: StatList[];
	export let staticStats: StatRangeList[];
	export let representOption: number;

	let constantWithoutDefaultStat: StatList[] = constantsStats.filter(
		(x) => x.Item1.ItemAttribute !== representOption
	);
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
					{#if stat.Item2.includes('{0:0.1f}')}
						{#if stat.Item1.ValueMin === stat.Item1.ValueMax}
							{stat.Item2.replace('{0:0.1f}', `${stat.Item1.ValueMin / 100}`)}
						{:else}
							{stat.Item2.replace(
								'{0:0.1f}',
								`${stat.Item1.ValueMin / 100} ~ ${stat.Item1.ValueMax / 100}`
							)}
						{/if}
					{:else if stat.Item2.includes('{0:d')}
						{#if stat.Item1.ValueMin === stat.Item1.ValueMax}
							{stat.Item2.replace('{0:d}', `${stat.Item1.ValueMin}`)}
						{:else}
							{stat.Item2.replace('{0:d}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
						{/if}
					{:else if stat.Item1.ValueMin === stat.Item1.ValueMax}
						{stat.Item2.replace('{0}', `${stat.Item1.ValueMin}`)}
					{:else}
						{stat.Item2.replace('{0}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
					{/if}
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
