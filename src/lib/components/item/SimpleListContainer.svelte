<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    gap?: number;
    classname?: string;
    children: Snippet;
  };
  let { gap = 1, classname, children }: Props = $props();
</script>

<div class={classname ? classname : 'mt-7'}>
  <div class="relative flex flex-col gap-{gap} p-4 px-6 border border-surface-400 rounded-lg bg-surface-500">
    {@render children()}
  </div>
</div>
