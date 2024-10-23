<script lang="ts">
  import { url } from '$lib/helpers/addBasePath';
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
      <img src={url('/quest/box.png')} alt="Meso" class="h-[16px] w-[16px]" />
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
          src={url('/resource/image/item/icon/90000001.png')}
          alt="Meso"
          class="h-[27px] w-[27px]"
        />
      </p>
    {/if}
    {#if reward.Rue}
      <p class="rue mt-2 flex gap-1 items-center">
        {reward.Rue.toLocaleString()}
        <img
          src={url('/resource/image/item/icon/90000013.png')}
          alt="Rue"
          class="h-[27px] w-[27px]"
        />
      </p>
    {/if}
    {#if reward.EssentialItem.length > 0}
      <div class="flex mt-2 gap-2">
        {#each reward.EssentialItem as item}
          <a href={`/items/${item.Id}`} target="_blank">
            <ItemImage
              iconPath={item.IconPath}
              rarity={item.Rarity}
              name={item.Name}
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
              iconPath={item.IconPath}
              rarity={item.Rarity}
              name={item.Name}
              minCount={item.Amount}
              isOutfit={item.IsOutfit}
            />
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  @mixin stroke($color: #000, $size: 1px) {
    text-shadow:
      -#{$size} -#{$size} 0 $color,
      0 -#{$size} 0 $color,
      #{$size} -#{$size} 0 $color,
      #{$size} 0 0 $color,
      #{$size} #{$size} 0 $color,
      0 #{$size} 0 $color,
      -#{$size} #{$size} 0 $color,
      -#{$size} 0 0 $color;
  }

  .experience {
    @include stroke(#000);

    color: #7cc422;
    font-size: 1.3rem;
  }

  .meso {
    @include stroke(#000);

    color: #e5a200;
    font-size: 1.3rem;
  }

  .rue {
    @include stroke(#000);

    color: white;
    font-size: 1.3rem;
  }
</style>
