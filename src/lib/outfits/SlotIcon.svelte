<script lang="ts">
  import { slotArtwork } from './slotArtwork';
  let { slot, size = 24 }: { slot: string; size?: number } = $props();
  const artwork = $derived(slotArtwork[slot]);
</script>

{#if artwork}
  <img
    src={`/outfits/slots/${artwork}.png`}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable="false"
  />
{/if}
