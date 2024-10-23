<script lang="ts">
  import { url } from '$lib/helpers/addBasePath';

  type ItemImageProp = {
    iconPath: string;
    name: string;
    rarity: number;
    minCount?: number;
    maxCount?: number;
    isOutfit?: boolean;
  };

  let { iconPath, rarity, name, minCount, maxCount, isOutfit }: ItemImageProp = $props();
  const noImage = url('/resource/sprites/disable overlay.png');
  const fixIconPath = () => url(`/${iconPath.split('/').slice(2).join('/')}`);

  const calcMinMaxCount = () => {
    if (maxCount) {
      if (minCount !== maxCount) {
        return `${minCount} ~ ${maxCount}`;
      }

      return `${minCount}`;
    }
    return `${minCount}`;
  };

  const handleMissingImage = (event: Event) => {
    event.preventDefault();
    image = noImage;
  };

  let image = $derived(iconPath === '' ? noImage : fixIconPath());
</script>

<div class="frame relative">
  <img
    src={url('/resource/sprites/slot_frame.png')}
    width={64}
    height={64}
    alt="background"
    class="absolute mx-auto"
    style="left: 2px; top: 2px;"
  />
  <img
    src={url(`/resource/sprites/slot bg ${rarity}.png`)}
    width={60}
    height={60}
    alt="background"
    class="absolute"
    style="left: 2px; top: 2px;"
  />
  <img
    src={image}
    width={60}
    height={60}
    alt={name}
    class="absolute"
    style="left: 2px; top: 2px;"
    onerror={handleMissingImage}
  />
  {#if isOutfit}
    <img
      src={url('/resource/sprites/icon_skin.png')}
      width={16}
      height={15}
      alt="outfit"
      class="absolute"
      style="left: 0px; bottom: -2px;"
    />
  {/if}
  {#if minCount && minCount > 1}
    <p class="absolute bottom-0 right-0 shadow">
      {calcMinMaxCount()}
    </p>
  {/if}
</div>

<style lang="scss">
  .frame {
    height: 60px;
    width: 60px;
  }

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

  .shadow {
    @include stroke(#000000, 2px);
  }
</style>
