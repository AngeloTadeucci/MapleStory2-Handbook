<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { url } from '$lib/helpers/addBasePath';

  // April Fools: Only active on April 1st (UTC)
  const isAprilFools = () => {
    const now = new Date();
    return now.getUTCMonth() === 3 && now.getUTCDate() === 1; // Month is 0-indexed
  };

  // Local state
  let showMeter = $state(false);
  let globalCount = $state(0);
  let isLoading = $state(true);
  let showClickFeedback = $state(false);

  // Batching state
  let pendingClicks = $state(0);
  let syncInterval: ReturnType<typeof setInterval> | null = null;
  const SYNC_INTERVAL_MS = 2000; // Sync every 2 seconds

  const frogMessages = [
    '🐸 Global Young Frog Appreciations',
    '✨ Worldwide Young Frog Love',
    '🏆 Community Young Frog Points',
    '💚 Young Frog Fans United'
  ];

  const randomMessage = frogMessages[Math.floor(Math.random() * frogMessages.length)];

  // Milestones with thresholds and messages
  const milestones = [
    { threshold: 0, message: 'Click to appreciate the Young Frog!' },
    { threshold: 10, message: 'The Young Frog is being discovered!' },
    { threshold: 50, message: 'Young Frog popularity rising!' },
    { threshold: 100, message: 'The Young Frog is becoming legendary!' },
    { threshold: 500, message: 'YOUNG FROG FEVER IS SPREADING!' },
    { threshold: 1000, message: '🐸 THE YOUNG FROG ASCENDS 🐸' },
    { threshold: 2500, message: '🐸🐸 YOUNG FROG GODHOOD ACHIEVED 🐸🐸' },
    { threshold: 5000, message: '🐸🐸🐸 YOUNG FROG SINGULARITY 🐸🐸🐸' },
    { threshold: 10_000, message: '🎉 Tadeucci adds Young Frog to site logo 🎉' },
    { threshold: 25_000, message: '💀 Tadeucci mass-releases pet frogs IRL 💀' },
    { threshold: 50_000, message: '🎵 Tadeucci will add soundtrack player 🎵' },
    { threshold: 100_000, message: '🏠 Tadeucci will add housing blocks catalog 🏠' },
    { threshold: 250_000, message: '🗺️ Tadeucci will finish all map details 🗺️' },
    { threshold: 500_000, message: '📦 Tadeucci will add item drop tables 📦' },
    { threshold: 750_000, message: '🎰 Tadeucci will add attribute roll simulator 🎰' },
    { threshold: 1_000_000, message: '💬 Tadeucci will add NPC dialog viewer 💬' },
    { threshold: 2_000_000, message: '👑 Young Frog achieves world domination 👑' },
    { threshold: 5_000_000, message: '🐸∞ ETERNAL FROG TRANSCENDENCE ∞🐸' }
  ];

  const getCurrentMilestone = (count: number) => {
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (count >= milestones[i].threshold) {
        return { current: milestones[i], next: milestones[i + 1] || null, index: i };
      }
    }
    return { current: milestones[0], next: milestones[1], index: 0 };
  };

  const getMilestoneMessage = (count: number) => {
    const { current } = getCurrentMilestone(count);
    return current.message;
  };

  const getBarPercentage = () => {
    if (globalCount === 0) return 0;

    const { current, next } = getCurrentMilestone(globalCount);

    // If no next milestone, bar is full
    if (!next) return 100;

    // Calculate progress within current milestone range
    const rangeStart = current.threshold;
    const rangeEnd = next.threshold;
    const progress = (globalCount - rangeStart) / (rangeEnd - rangeStart);

    return Math.min(progress * 100, 100);
  };

  const getNextMilestoneText = () => {
    const { next } = getCurrentMilestone(globalCount);
    if (!next) return null;
    return `Next: ${next.threshold.toLocaleString()} - ${next.message}`;
  };

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

  async function syncToServer() {
    if (pendingClicks === 0) return;

    const clicksToSync = pendingClicks;
    pendingClicks = 0; // Reset pending clicks

    try {
      const response = await fetch('/api/frog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: clicksToSync })
      });
      const data = await response.json();

      // Sync with server's authoritative count
      // Only update if server count is higher (other users may have clicked too)
      if (data.count > globalCount) {
        globalCount = data.count;
      }
    } catch {
      // Network error - add clicks back to pending
      pendingClicks += clicksToSync;
    }
  }

  function startSyncInterval() {
    if (syncInterval) return; // Already running
    syncInterval = setInterval(syncToServer, SYNC_INTERVAL_MS);
  }

  function stopSyncInterval() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }

  function appreciateFrog() {
    // Instant local update - no waiting!
    globalCount += 1;
    pendingClicks += 1;

    // Visual feedback
    showClickFeedback = true;
    setTimeout(() => (showClickFeedback = false), 150);

    // Make sure sync interval is running
    startSyncInterval();
  }

  onMount(() => {
    showMeter = isAprilFools();
    if (showMeter) {
      fetchCount();
    }
  });

  onDestroy(() => {
    // Stop interval and sync any remaining clicks
    stopSyncInterval();
    if (pendingClicks > 0) {
      // Fire and forget - component is being destroyed
      navigator.sendBeacon('/api/frog', JSON.stringify({ amount: pendingClicks }));
    }
  });
</script>

{#if showMeter}
<div class="frog-meter rounded-lg bg-gradient-to-r from-green-900 to-green-700 p-4">
  <div class="flex items-center justify-between gap-4">
    <div class="flex-1">
      <p class="mb-2 text-sm font-bold text-green-100">
        {randomMessage}: {isLoading ? '...' : globalCount.toLocaleString()}
      </p>
      <div class="h-6 w-full overflow-hidden rounded-full bg-green-950">
        <div
          class="bar h-full bg-gradient-to-r from-yellow-300 via-green-300 to-blue-300 transition-all duration-100"
          class:bar-pulse={showClickFeedback}
          style="width: {getBarPercentage()}%"
        ></div>
      </div>
      <p class="mt-1 text-center text-xs font-semibold text-green-100">
        {getMilestoneMessage(globalCount)}
      </p>
      {#if getNextMilestoneText()}
        <p class="mt-1 text-center text-xs text-green-300 opacity-75">
          {getNextMilestoneText()}
        </p>
      {/if}
    </div>
    <button
      onclick={appreciateFrog}
      disabled={isLoading}
      class="frog-button transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
      class:frog-clicked={showClickFeedback}
      title="Click to appreciate the Young Frog!"
    >
      <img
        src={url('/resource/image/item/icon/30000071.png')}
        alt="Young Frog"
        width="64"
        height="64"
        class="frog-icon"
      />
    </button>
  </div>
</div>
{/if}

<style>
  .frog-meter {
    animation: ribbit-glow 2s ease-in-out infinite;
  }

  @keyframes ribbit-glow {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }
    50% {
      box-shadow:
        0 0 20px rgba(34, 197, 94, 0.6),
        0 0 30px rgba(34, 197, 94, 0.3);
    }
  }

  .frog-button {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.5rem;
    border-radius: 50%;
  }

  .frog-button:not(:disabled):hover {
    filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.8));
  }

  .frog-icon {
    image-rendering: pixelated;
  }

  .frog-clicked {
    animation: frog-bounce 0.15s ease-out;
  }

  @keyframes frog-bounce {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  .bar-pulse {
    animation: bar-flash 0.15s ease-out;
  }

  @keyframes bar-flash {
    0% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.3);
    }
    100% {
      filter: brightness(1);
    }
  }
</style>
