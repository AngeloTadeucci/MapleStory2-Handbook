<script lang="ts">
  interface Props {
    size?: string;
    class?: string;
  }

  let { size = '2rem', class: className = '' }: Props = $props();
</script>

<div
  class="animate-spin rounded-full border-4 border-surface-600 border-t-primary-500 {className}"
  style="width: {size}; height: {size};"
></div>
