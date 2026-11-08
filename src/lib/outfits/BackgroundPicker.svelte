<script lang="ts">
  import { ChevronDown, Check } from 'lucide-svelte';
  import {
    backgroundGroups,
    backgroundName,
    backgroundThumbnailUrl,
    findBackground
  } from './backgrounds';
  let {
    value,
    base,
    disabled = false,
    onselect
  }: {
    value: string;
    base: string;
    disabled?: boolean;
    onselect: (id: string) => void;
  } = $props();
  const studioImage = '/outfits/character-background.png';
  let open = $state(false);
  let filter = $state('');
  const query = $derived(filter.trim().toLowerCase());
  const showStudio = $derived(!query || 'studio'.includes(query));
  const groups = $derived(
    query
      ? backgroundGroups
          .map(
            ([region, entries]) =>
              [
                region,
                entries.filter((entry) =>
                  `${entry.region} ${entry.label} ${backgroundName(entry.id)}`
                    .toLowerCase()
                    .includes(query)
                )
              ] as const
          )
          .filter(([, entries]) => entries.length > 0)
      : backgroundGroups
  );
  const current = $derived(findBackground(value));
  const panelId = $props.id();
  function choose(id: string) {
    if (!disabled && id !== value) onselect(id);
  }
  let trigger: HTMLButtonElement;
  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    open = false;
    trigger.focus();
  }
</script>

<div class="background-picker">
  <span class="caption" id="{panelId}-caption">Background</span>
  <button
    type="button"
    class="trigger"
    bind:this={trigger}
    aria-labelledby="{panelId}-caption {panelId}-current"
    aria-expanded={open}
    aria-controls={panelId}
    onclick={() => (open = !open)}
  >
    <img
      class="swatch"
      src={current ? backgroundThumbnailUrl(base, current) : studioImage}
      alt=""
      width="28"
      height="28"
    />
    <span id="{panelId}-current" class="current">{backgroundName(value)}</span>
    <ChevronDown size={16} class={open ? 'chevron open' : 'chevron'} />
  </button>
  {#if open}
    <div class="panel" id={panelId} role="group" aria-label="Backgrounds">
      <input
        type="search"
        aria-label="Filter backgrounds"
        placeholder="Filter, e.g. Henesys or Wide"
        bind:value={filter}
        onkeydown={keydown}
      />
      <div class="scroller">
        {#if showStudio}
          <section>
            <h3>Studio</h3>
            <div class="tiles">
              {@render tile('', 'Studio', studioImage)}
            </div>
          </section>
        {/if}
        {#each groups as [region, entries] (region)}
          <section>
            <h3>{region}</h3>
            <div class="tiles">
              {#each entries as entry (entry.id)}
                {@render tile(entry.id, entry.label, backgroundThumbnailUrl(base, entry))}
              {/each}
            </div>
          </section>
        {:else}
          {#if !showStudio}<p class="empty">No backgrounds match “{filter.trim()}”.</p>{/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

{#snippet tile(id: string, label: string, src: string)}
  <button
    type="button"
    class="tile"
    class:selected={id === value}
    aria-pressed={id === value}
    aria-label={backgroundName(id)}
    title={backgroundName(id)}
    {disabled}
    onclick={() => choose(id)}
    onkeydown={keydown}
  >
    <span class="thumb">
      <img {src} alt="" loading="lazy" decoding="async" width="160" height="160" />
      {#if id === value}<span class="tick"><Check size={12} strokeWidth={3} /></span>{/if}
    </span>
    <span class="label">{label}</span>
  </button>
{/snippet}

<style>
  .background-picker {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }
  .caption {
    font-size: 0.75rem;
    color: var(--color-surface-100);
  }
  button,
  input {
    border: 1px solid var(--color-surface-400);
    border-radius: 0.5rem;
    background: var(--color-surface-700);
    color: var(--color-surface-50);
    font-size: 0.8rem;
  }
  button {
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  :is(button, input):focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 3px;
  }
  .trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.6rem 0.3rem 0.3rem;
    text-align: left;
    min-width: 0;
  }
  .trigger:hover {
    background: var(--color-surface-600);
  }
  .swatch {
    width: 1.75rem;
    height: 1.75rem;
    flex: none;
    border-radius: 0.3rem;
    object-fit: cover;
  }
  .current {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .trigger :global(.chevron) {
    flex: none;
    transition: transform 0.15s;
  }
  .trigger :global(.chevron.open) {
    transform: rotate(180deg);
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid var(--color-surface-400);
    border-radius: 0.6rem;
    background: var(--color-surface-800);
  }
  input {
    padding: 0.45rem 0.6rem;
    width: 100%;
  }
  .scroller {
    max-height: 21rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 0.15rem;
  }
  section + section {
    margin-top: 0.6rem;
  }
  h3 {
    margin: 0 0 0.3rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-surface-200);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.25rem, 1fr));
    gap: 0.4rem;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.2rem;
    border-color: transparent;
    background: transparent;
    min-width: 0;
  }
  .tile:enabled:hover {
    background: var(--color-surface-600);
  }
  .tile.selected {
    background: var(--color-surface-500);
    border-color: var(--color-surface-200);
  }
  .thumb {
    position: relative;
    display: block;
    aspect-ratio: 1;
    border-radius: 0.35rem;
    overflow: hidden;
    background: var(--color-surface-900);
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .tick {
    position: absolute;
    right: 0.2rem;
    bottom: 0.2rem;
    display: grid;
    place-items: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 999px;
    background: var(--color-surface-950);
    color: var(--color-surface-50);
  }
  .label {
    font-size: 0.68rem;
    line-height: 1.2;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile.selected .label {
    font-weight: 700;
  }
  .empty {
    margin: 0.4rem 0;
    font-size: 0.75rem;
    color: var(--color-surface-200);
  }
</style>
