<script lang="ts">
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import { getImageUrl } from '$lib/getImageUrl';
  import type { QuestItem, Rewards } from '$lib/types/Quest';
  import { ExpType } from '$lib/Enums';

  interface Props {
    reward: Rewards;
    text: string;
  }

  let { reward, text }: Props = $props();
</script>

{#if reward.Exp > 0 || reward.Meso > 0 || reward.EssentialItem.length > 0}
  <div class="mb-4">
    <div class="flex gap-2 items-center mb-2">
      <img src="/quest/box.png" alt="Meso" class="h-4 w-4" />
      <p>{text}</p>
    </div>
    {#if reward.Exp > 0 && reward.RelativeExp > 0}
      <p class="experience">
        {reward.Exp.toLocaleString()} (Relative {ExpType[reward.RelativeExp]}) Experience
      </p>
    {/if}
    {#if reward.Exp === 0 && reward.RelativeExp > 1}
      <p class="experience">Relative {ExpType[reward.RelativeExp]} Experience</p>
    {/if}

    {#if reward.Meso}
      <p class="meso mt-2 flex gap-1 items-center">
        {reward.Meso.toLocaleString()}
        <img
          src={getImageUrl('/resource/image/item/icon/90000001.png')}
          alt="Meso"
          class="h-6.75 w-6.75"
        />
      </p>
    {/if}
    {#if reward.Rue}
      <p class="rue mt-2 flex gap-1 items-center">
        {reward.Rue.toLocaleString()}
        <img
          src={getImageUrl('/resource/image/item/icon/90000013.png')}
          alt="Rue"
          class="h-6.75 w-6.75"
        />
      </p>
    {/if}
    {#if reward.EssentialItem.length > 0}
      {@render itemGrid(reward.EssentialItem)}
    {/if}
    {#if reward.EssentialJobItem.length > 0}
      {@render itemGrid(reward.EssentialJobItem)}
    {/if}
  </div>
{/if}

{#snippet itemGrid(items: QuestItem[])}
  <div class="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
    {#each items as item}
      <a
        href={`/items/${item.Id}`}
        target="_blank"
        class="unstyled flex min-w-0 items-center gap-2 rounded p-1 transition-colors hover:bg-surface-600"
      >
        <div class="shrink-0">
          <ItemImage
            iconPath={item.IconPath ?? ''}
            rarity={item.Rarity}
            name={item.Name ?? ''}
            minCount={item.Amount}
            isOutfit={item.IsOutfit}
          />
        </div>
        <p class="min-w-0 text-sm font-semibold">{item.Name ?? item.Id}</p>
      </a>
    {/each}
  </div>
{/snippet}

<style>
  .experience {
    text-shadow:
      -1px -1px 0 #000,
      0 -1px 0 #000,
      1px -1px 0 #000,
      1px 0 0 #000,
      1px 1px 0 #000,
      0 1px 0 #000,
      -1px 1px 0 #000,
      -1px 0 0 #000;
    color: #7cc422;
    font-size: 1.3rem;
  }

  .meso {
    text-shadow:
      -1px -1px 0 #000,
      0 -1px 0 #000,
      1px -1px 0 #000,
      1px 0 0 #000,
      1px 1px 0 #000,
      0 1px 0 #000,
      -1px 1px 0 #000,
      -1px 0 0 #000;
    color: #e5a200;
    font-size: 1.3rem;
  }

  .rue {
    text-shadow:
      -1px -1px 0 #000,
      0 -1px 0 #000,
      1px -1px 0 #000,
      1px 0 0 #000,
      1px 1px 0 #000,
      0 1px 0 #000,
      -1px 1px 0 #000,
      -1px 0 0 #000;
    color: white;
    font-size: 1.3rem;
  }
</style>
