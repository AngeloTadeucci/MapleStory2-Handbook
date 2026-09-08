<script lang="ts">
  import type { ColorControl } from './materialColors';
  import type { Customization } from './faceAnimation';
  import DyeControl from './DyeControl.svelte';
  let {
    controls,
    customization,
    disabled = false
  }: { controls: ColorControl[]; customization?: Customization; disabled?: boolean } = $props();
</script>

{#each controls as control, detail (control)}
  <DyeControl {control} {customization} {disabled} {detail} />
{/each}
