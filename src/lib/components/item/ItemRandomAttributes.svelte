<script lang="ts">
	import type { StatRangeList } from 'src/types/Item';

	export let randomStats: StatRangeList[];
	export let randomStatCount: number;
	let toggleBonus: boolean = false;
</script>

<div class="text-lightBlue mt-3">
	<div class="flex flex-row gap-1">
		<p>Bonus Attributes (up to {randomStatCount} rolls)</p>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<p
			class="text-ascendant cursor-pointer"
			on:click={() => {
				toggleBonus = !toggleBonus;
			}}
		>
			[Click here to {toggleBonus ? 'retract' : 'expand'}]
		</p>
	</div>
	<div class="limit-size {toggleBonus ? '' : 'limit-size--active'}">
		<ul>
			{#each randomStats as stat}
				<li class="mt-1">
					{#if stat.Item2.includes('{0:0.1f}')}
						{stat.Item2.replace(
							'{0:0.1f}',
							`${stat.Item1.ValueMin / 100} ~ ${stat.Item1.ValueMax / 100}`
						)}
					{:else if stat.Item2.includes('{0:d')}
						{stat.Item2.replace('{0:d}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
					{:else}
						{stat.Item2.replace('{0}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>

<style lang="scss">
	.text-lightBlue {
		color: #91a8ff;
	}

	.text-ascendant {
		color: #ff8c37;
	}

	.limit-size {
		&--active {
			display: -webkit-box;
			-webkit-line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	}
</style>
