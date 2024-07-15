<script lang="ts">
  export let href: string;
  export let target = '_blank';
</script>

<a {href} {target} class="underline hover:text-primary-100-800-token">
  <slot />
</a>
