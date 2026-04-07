<script lang="ts">
	import { musicPlayer } from '$lib/stores/musicPlayer.svelte';
	import { SkipBack, SkipForward, Play, Pause, X, Volume2, VolumeX, Shuffle, Repeat } from 'lucide-svelte';
	import { formatDuration, bgmDisplayName } from '$lib/helpers/bgm';

	let expanded = $state(true);

	function handleProgressClick(e: MouseEvent) {
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const pct = (e.clientX - rect.left) / rect.width;
		musicPlayer.seek(pct * musicPlayer.duration);
	}

	function handleVolumeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		musicPlayer.setVolume(Number(target.value));
	}

	let progressPct = $derived(
		musicPlayer.duration > 0 ? (musicPlayer.currentTime / musicPlayer.duration) * 100 : 0
	);

	let displayName = $derived(
		musicPlayer.currentTrack ? bgmDisplayName(musicPlayer.currentTrack.name) : ''
	);

	let statusText = $derived(musicPlayer.isPlaying ? 'Now Playing' : 'Paused');

</script>

{#if musicPlayer.isVisible}
	<div class="player-wrapper" class:collapsed={!expanded}>
		{#if expanded}
			<!-- Expanded panel -->
			<div class="player-panel">
				<!-- Top bar: close & collapse -->
				<div class="flex items-center justify-between px-3 pt-2.5 pb-1">
					<span class="text-[10px] font-bold uppercase tracking-widest text-surface-400">{statusText}</span>
					<div class="flex gap-0.5">
						<button onclick={() => (expanded = false)} class="p-1 text-surface-300 hover:text-surface-100 transition-colors" title="Minimize">
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="6.5" width="8" height="1.5" rx="0.5" fill="currentColor"/></svg>
						</button>
						<button onclick={() => musicPlayer.close()} class="p-1 text-surface-300 hover:text-red-400 transition-colors" title="Close">
							<X size={14} />
						</button>
					</div>
				</div>

				<!-- Disc icon -->
				<div class="flex justify-center py-3">
					<div class="disc-icon" class:spinning={musicPlayer.isPlaying}>
						<img src="/resource/image/item/icon/30000071.png" alt="frog" width="28" height="28" class="rounded-full" />
					</div>
				</div>

				<!-- Track name -->
				<div class="px-3 text-center">
					<p class="truncate text-sm font-medium text-surface-100" title={displayName}>{displayName}</p>
					<p class="mt-0.5 text-[11px] text-surface-400">
						{formatDuration(musicPlayer.currentTime)}
						<span class="text-surface-600">/</span>
						{formatDuration(musicPlayer.duration)}
					</p>
				</div>

				<!-- Progress bar -->
				<div class="px-3 pt-2.5">
					<button
						class="group block h-1.5 w-full cursor-pointer rounded-full overflow-hidden"
						onclick={handleProgressClick}
						aria-label="Seek in track"
					>
						<div class="h-full w-full rounded-full bg-surface-600">
							<div class="h-full rounded-full bg-primary-500 transition-none" style="width: {progressPct}%"></div>
						</div>
					</button>
				</div>

				<!-- Controls -->
				<div class="flex items-center justify-center gap-2 py-3">
					<button onclick={() => musicPlayer.prev()} class="p-1.5 text-surface-400 hover:text-white transition-colors" title="Previous">
						<SkipBack size={16} />
					</button>
					<button
						onclick={() => musicPlayer.togglePlay()}
						class="play-btn flex items-center justify-center"
						title={musicPlayer.isPlaying ? 'Pause' : 'Play'}
					>
						{#if musicPlayer.isPlaying}
							<Pause size={18} />
						{:else}
							<Play size={18} class="ml-0.5" />
						{/if}
					</button>
					<button onclick={() => musicPlayer.next()} class="p-1.5 text-surface-400 hover:text-white transition-colors" title="Next">
						<SkipForward size={16} />
					</button>
				</div>

				<!-- Shuffle & Loop -->
				<div class="flex items-center justify-center gap-3 pb-1">
					<button
						onclick={() => musicPlayer.toggleShuffle()}
						class="p-1 transition-colors {musicPlayer.shuffle ? 'text-primary-400' : 'text-surface-400 hover:text-surface-200'}"
						title="Shuffle"
					>
						<Shuffle size={14} />
					</button>
					<button
						onclick={() => musicPlayer.toggleLoop()}
						class="p-1 transition-colors {musicPlayer.loop ? 'text-primary-400' : 'text-surface-400 hover:text-surface-200'}"
						title="Loop"
					>
						<Repeat size={14} />
					</button>
				</div>

				<!-- Volume -->
				<div class="flex items-center gap-2 border-t border-surface-700 px-3 py-2">
					<button
						onclick={() => musicPlayer.setVolume(musicPlayer.volume > 0 ? 0 : 0.7)}
						class="p-0.5 text-surface-400 hover:text-white transition-colors"
						title={musicPlayer.volume > 0 ? 'Mute' : 'Unmute'}
					>
						{#if musicPlayer.volume === 0}
							<VolumeX size={14} />
						{:else}
							<Volume2 size={14} />
						{/if}
					</button>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={musicPlayer.volume}
						oninput={handleVolumeInput}
						class="volume-slider"
					/>
				</div>
			</div>
		{:else}
			<!-- Minimized: floating disc button -->
			<button
				onclick={() => (expanded = true)}
				class="mini-btn"
				title="Expand player"
			>
				<div class="disc-icon-mini" class:spinning={musicPlayer.isPlaying}>
					<img src="/resource/image/item/icon/30000071.png" alt="frog" width="24" height="24" class="rounded-full" />
				</div>
			</button>
		{/if}
	</div>
{/if}

<style>
	.player-wrapper {
		position: fixed;
		bottom: 24px;
		right: 20px;
		z-index: 50;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.player-panel {
		width: 220px;
		background: color-mix(in srgb, var(--color-surface-800) 92%, transparent);
		backdrop-filter: blur(16px);
		border: 1px solid var(--color-surface-600);
		border-radius: 16px;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.5),
			0 0 1px rgba(132, 214, 255, 0.1);
		overflow: hidden;
		animation: panel-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Spinning disc icon */
	.disc-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-surface-700);
		border: 2px solid var(--color-surface-600);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.disc-icon.spinning {
		animation: spin 4s linear infinite;
	}

	.disc-icon-mini {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Play button */
	.play-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-primary-500);
		color: var(--color-surface-900);
		transition: all 0.15s ease;
	}

	.play-btn:hover {
		background: var(--color-primary-400);
		box-shadow: 0 0 12px rgba(132, 214, 255, 0.3);
	}

	/* Mini button */
	.mini-btn {
		position: relative;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-surface-800) 90%, transparent);
		backdrop-filter: blur(12px);
		border: 1px solid var(--color-surface-600);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		animation: mini-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.mini-btn:hover {
		border-color: var(--color-primary-500);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 8px rgba(132, 214, 255, 0.15);
	}

	@keyframes mini-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Volume slider */
	.volume-slider {
		-webkit-appearance: none;
		appearance: none;
		flex: 1;
		height: 3px;
		border-radius: 2px;
		background: var(--color-surface-600);
		outline: none;
		cursor: pointer;
	}

	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-primary-500);
		cursor: pointer;
		transition: box-shadow 0.15s ease;
	}

	.volume-slider::-webkit-slider-thumb:hover {
		box-shadow: 0 0 6px rgba(132, 214, 255, 0.4);
	}

	.volume-slider::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-primary-500);
		border: none;
		cursor: pointer;
	}
</style>
