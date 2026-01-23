<script lang="ts">
  import type { StatRangeList } from '../../types/Item';

  interface Props {
    randomStats: StatRangeList[];
    randomStatCount: number;
  }

  let { randomStats, randomStatCount }: Props = $props();
  let toggleBonus: boolean = $state(false);
</script>

<div class="text-lightBlue mt-3">
  <!-- Desktop: button inline -->
  <div class="hidden sm:flex flex-row gap-1">
    <p>Bonus Attributes (up to {randomStatCount} rolls)</p>
    <button
      class="text-ascendant cursor-pointer"
      onclick={() => {
        toggleBonus = !toggleBonus;
      }}
    >
      [Click here to {toggleBonus ? 'retract' : 'expand'}]
    </button>
  </div>

  <!-- Mobile: button above -->
  <div class="sm:hidden flex flex-col gap-1">
    <button
      class="text-ascendant cursor-pointer text-left"
      onclick={() => {
        toggleBonus = !toggleBonus;
      }}
    >
      [Click here to {toggleBonus ? 'retract' : 'expand'}]
    </button>
    <p>Bonus Attributes (up to {randomStatCount} rolls)</p>
  </div>

  <div class="limit-size {toggleBonus ? '' : 'limit-size--active'}">
    <ul>
      {#each randomStats as stat, index}
        <li class="mt-1">
          {#if stat.Item2.includes('{0:0.1f}')}
            {stat.Item2.replace('{0:0.1f}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
          {:else if stat.Item2.includes('{0:d')}
            {stat.Item2.replace('{0:d}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
          {:else}
            {stat.Item2.replace('{0}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
          {/if}
        </li>
        {#if index === 2 && !toggleBonus}
          {#if randomStats.length > 3}
            <li class="mt-1"><wbr /></li>
          {/if}
        {/if}
      {/each}
    </ul>
  </div>
</div>

<style>
  .text-lightBlue {
    color: #91a8ff;
  }

  .text-ascendant {
    color: #ff8c37;
  }

  .limit-size--active {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
