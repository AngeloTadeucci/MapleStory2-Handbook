<script lang="ts">
  import type { ColorPalette } from '$lib/colorPalette';

  export let color: ColorPalette;

  function convertToHexColor(value: number | undefined) {
    if (!value) {
      return '#000000';
    }
    // Convert the color value to a hex string, removing the '0xff' prefix
    return '#' + value.toString(16).slice(2);
  }
</script>

{#if color.show2color}
  <div class="relative rounded-md w-6 h-6 overflow-hidden">
    <div
      class="absolute top-0 left-0 w-full h-full"
      style="background-color: {convertToHexColor(
        color.ch0
      )}; clip-path: polygon(0 0, 100% 0, 0 100%)"
    />
    <div
      class="absolute top-0 right-0 w-full h-full"
      style="background-color: {convertToHexColor(
        color.ch2
      )}; clip-path: polygon(100% 0, 100% 100%, 0 100%)"
    />
  </div>
{:else}
  <div class="rounded-md w-6 h-6" style="background-color: {convertToHexColor(color.palette)}" />
{/if}
