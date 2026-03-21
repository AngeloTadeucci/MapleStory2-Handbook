<script lang="ts">
  import { onMount } from 'svelte';
  import { url } from '$lib/helpers/addBasePath';

  // April Fools: Only active on April 1st (UTC)
  const isAprilFools = () => {
    const now = new Date();
    return now.getUTCMonth() === 3 && now.getUTCDate() === 1; // Month is 0-indexed
  };

  let showBanner = $state(false);
  let globalCount = $state(0);
  let isLoading = $state(true);

  async function fetchCount() {
    try {
      const response = await fetch('/api/frog');
      const data = await response.json();
      globalCount = data.count;
    } catch {
      // Silently fail
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    showBanner = isAprilFools();
    if (!showBanner) return;

    fetchCount();
    // Refresh count every 10 seconds
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  });
</script>

{#if showBanner}
<a href={url('/items/30000071')} class="unstyled">
  <div class="frog-banner mb-4 flex items-center justify-center gap-4 rounded-lg bg-gradient-to-r from-green-900 via-green-800 to-green-900 p-3">
    <img
      src={url('/resource/image/item/icon/30000071.png')}
      alt="Young Frog"
      width="40"
      height="40"
      class="frog-icon"
    />
    <div class="text-center">
      <p class="text-sm font-bold text-green-100">
        YOUNG FROG APPRECIATION EVENT
      </p>
      <p class="text-xs text-green-200">
        {isLoading ? 'Loading...' : `${globalCount.toLocaleString()} clicks and counting! Join the movement!`}
      </p>
    </div>
    <img
      src={url('/resource/image/item/icon/30000071.png')}
      alt="Young Frog"
      width="40"
      height="40"
      class="frog-icon"
    />
  </div>
</a>
{/if}

<style>
  .frog-banner {
    animation: banner-glow 3s ease-in-out infinite;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .frog-banner:hover {
    transform: scale(1.02);
  }

  @keyframes banner-glow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.5), 0 0 30px rgba(34, 197, 94, 0.2);
    }
  }

  .frog-icon {
    image-rendering: pixelated;
    animation: frog-hop 1s ease-in-out infinite;
  }

  @keyframes frog-hop {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
</style>
