<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    href: string;
    target?: string;
    children: Snippet;
  }

  let { href, target = '_blank', children }: Props = $props();
</script>

<a {href} {target} class="underline hover:text-primary-100-900">
  {@render children()}
</a>
