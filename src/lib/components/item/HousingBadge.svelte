<script lang="ts">
  import { Home, Coins, Gem, Lock } from 'lucide-svelte';
  import { getHousingCategoryLabel, getHousingTokenLabel } from '$lib/helpers/housing';

  interface Props {
    category: number;
    tokenType?: number | null;
    price?: number | null;
    buyable?: number | null;
    compact?: boolean;
  }

  let { category, tokenType = null, price = null, buyable = null, compact = false }: Props = $props();

  const categoryLabel = $derived(getHousingCategoryLabel(category));
  const tokenLabel = $derived(tokenType == null ? null : getHousingTokenLabel(tokenType));
  const showPrice = $derived(price != null && price > 0 && tokenType != null);
</script>

<div class="flex flex-wrap items-center gap-2 text-sm">
  <span class="inline-flex items-center gap-1 rounded bg-surface-600 px-2 py-1 text-surface-100">
    <Home size={compact ? 14 : 16} />
    {categoryLabel}
  </span>

  {#if showPrice}
    <span class="inline-flex items-center gap-1 rounded bg-surface-600 px-2 py-1 text-surface-100">
      {#if tokenType === 1}
        <Gem size={compact ? 14 : 16} />
      {:else}
        <Coins size={compact ? 14 : 16} />
      {/if}
      {price?.toLocaleString()} {tokenLabel}
    </span>
  {/if}

  {#if buyable === 0}
    <span class="inline-flex items-center gap-1 rounded bg-surface-600 px-2 py-1 text-surface-300">
      <Lock size={compact ? 14 : 16} />
      Not Buyable
    </span>
  {/if}
</div>
