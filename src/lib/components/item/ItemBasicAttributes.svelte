<script lang="ts">
  import type {
    AdditionalEffectDescription,
    AdditionalEffects,
    StatList,
    StatRangeList
  } from '../../types/Item';

  interface Props {
    constantsStats: StatList[];
    staticStats: StatRangeList[];
    representOption: number;
    additionalEffects: string;
    additionalEffectsDescriptions: AdditionalEffectDescription[];
  }

  let {
    constantsStats,
    staticStats,
    representOption,
    additionalEffects,
    additionalEffectsDescriptions
  }: Props = $props();

  const descriptions = $derived.by(() => {
    const result: string[] = [];
    if (additionalEffects) {
      const effects = JSON.parse(additionalEffects) as AdditionalEffects[];

      for (const effect of effects) {
        const description = additionalEffectsDescriptions.find((x) => x.id === effect.Item1)?.name;
        if (description) {
          result.push(description);
        }
      }
    }
    return result;
  });

  const constantWithoutDefaultStat = $derived(
    constantsStats.filter((x) => x.Item1.ItemAttribute !== representOption)
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
              {stat.Item2.replace('{0:0.1f}', `${stat.Item1.ValueMin}`)}
            {:else}
              {stat.Item2.replace('{0:0.1f}', `${stat.Item1.ValueMin} ~ ${stat.Item1.ValueMax}`)}
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
      {#each descriptions as effect}
        <li class="mt-1">
          {effect}
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
