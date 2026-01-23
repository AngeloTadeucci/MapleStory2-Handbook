<script lang="ts">
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import type { Rewards } from '$lib/types/Quest';
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
          src="/resource/image/item/icon/90000001.png"
          alt="Meso"
          class="h-6.75 w-6.75"
        />
      </p>
    {/if}
    {#if reward.Rue}
      <p class="rue mt-2 flex gap-1 items-center">
        {reward.Rue.toLocaleString()}
        <img
          src="/resource/image/item/icon/90000013.png"
          alt="Rue"
          class="h-6.75 w-6.75"
        />
      </p>
    {/if}
    {#if reward.EssentialItem.length > 0}
      <div class="flex mt-2 gap-2">
        {#each reward.EssentialItem as item}
          <a href={`/items/${item.Id}`} target="_blank">
            <ItemImage
              iconPath={item.IconPath ?? ''}
              rarity={item.Rarity ?? ''}
              name={item.Name ?? ''}
              minCount={item.Amount}
              isOutfit={item.IsOutfit}
            />
          </a>
        {/each}
      </div>
    {/if}
    {#if reward.EssentialJobItem.length > 0}
      <div class="flex mt-2 gap-2">
        {#each reward.EssentialJobItem as item}
          <a href={`/items/${item.Id}`} target="_blank">
            <ItemImage
              iconPath={item.IconPath ?? ''}
              rarity={item.Rarity ?? ''}
              name={item.Name ?? ''}
              minCount={item.Amount}
              isOutfit={item.IsOutfit}
            />
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}

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
