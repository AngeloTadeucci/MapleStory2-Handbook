<script lang="ts">
  import { colorPalettes } from '$lib/colorPalette';
  import { getColorPaletteName } from '$lib/colorPaletteName';
  import PaletteColor from '$lib/components/PaletteColor.svelte';
</script>

<svelte:head>
  <title>MS2 Handbook - Dyes</title>
</svelte:head>

<div class="main-container grid-image mx-4 mt-3 rounded-xl bg-surface-700 p-6 pb-40">
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {#each colorPalettes as color}
      <div class="flex gap-1">
        <PaletteColor {color} />
        <a href={`/trophies/${color.achieveID}`} class="text-gold underline">
          {getColorPaletteName(color.stringKey)} Dye
        </a>
      </div>
    {/each}
  </div>
</div>
