<script lang="ts">
  import { Check } from 'lucide-svelte';
  import type { ColorControl, Rgb } from './materialColors';
  import type { Customization } from './faceAnimation';
  import { applyDye, dyeChoices, matchesDye, rgbHex } from './dyePicker';
  import CustomColorPicker from './CustomColorPicker.svelte';
  let {
    control,
    customization,
    disabled = false,
    detail = 0
  }: {
    control: ColorControl;
    customization?: Customization;
    disabled?: boolean;
    detail?: number;
  } = $props();
  const uid = $props.id();
  let revision = $state(0),
    channel = $state(0);
  $effect(() => {
    if (control.activeChannels?.[channel] === false) {
      const first = control.activeChannels.findIndex((active) => active);
      if (first >= 0) channel = first;
    }
  });
  let mode = $state('basic'),
    search = $state(''),
    hovered = $state('');
  const choices = $derived(dyeChoices(control, customization));
  const colors = $derived.by(() => {
    void revision;
    return control.colors.map((rgb) => [...rgb] as Rgb);
  });
  const selected = $derived(choices.find((choice) => matchesDye(choice, colors)));
  const filtered = $derived(
    choices.filter((choice) =>
      choice.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    )
  );
  const names = ['Primary', 'Accent', 'Shade'];
  const heading = $derived(
    control.label === 'Skin'
      ? 'Skin color'
      : control.shader === 'Face'
        ? 'Eye color'
        : control.shader.includes('Hair')
          ? 'Hair color'
          : detail
            ? `Detail colors ${detail}`
            : 'Item color'
  );
  function changeColor(color: Rgb) {
    control.set(channel, color);
    revision++;
  }
</script>

<fieldset class="dye-control" {disabled} aria-label={`${control.label} colors`}>
  <legend>{heading}</legend>
  <div class="mode-switch">
    <label
      ><input type="radio" name={`${uid}-mode`} value="basic" bind:group={mode} /> Basic colors</label
    >
    <label
      ><input type="radio" name={`${uid}-mode`} value="custom" bind:group={mode} /> Custom</label
    >
    <span class="color-wheel" aria-hidden="true"></span>
  </div>
  {#if mode === 'basic'}
    <input
      class="dye-search"
      type="search"
      placeholder="Find a dye…"
      aria-label={`${control.label} dye search`}
      bind:value={search}
    />
    <div class="swatch-grid" aria-label="Dye swatches">
      {#each filtered as choice (choice.id)}
        <button
          type="button"
          class="swatch"
          style:background={choice.background}
          title={choice.name}
          aria-label={choice.name}
          aria-pressed={selected?.id === choice.id}
          onpointerenter={() => (hovered = choice.name)}
          onpointerleave={() => (hovered = '')}
          onfocus={() => (hovered = choice.name)}
          onblur={() => (hovered = '')}
          onclick={() => {
            control.setColors(applyDye(choice, colors));
            revision++;
          }}
        >
          {#if selected?.id === choice.id}<Check size={22} strokeWidth={3} />{/if}
        </button>
      {/each}
      {#if !filtered.length}<p class="no-colors">No dyes match this name.</p>{/if}
    </div>
    <p class="dye-name" aria-live="polite">{hovered || selected?.name || 'Custom color'}</p>
  {:else}
    <div class="custom-layout">
      <div class="channel-switch" aria-label="Color channels">
        {#each colors as color, index}
          <button
            type="button"
            class="swatch channel"
            style:background={rgbHex(color)}
            disabled={disabled || control.activeChannels?.[index] === false}
            title={control.activeChannels?.[index] === false
              ? `${names[index]} is not used by this item`
              : names[index]}
            aria-label={`${control.label} ${names[index]} channel`}
            aria-pressed={channel === index}
            onclick={() => (channel = index)}
          >
            {#if channel === index}<Check size={20} strokeWidth={3} />{/if}
          </button>
        {/each}
      </div>
      {#key channel}<CustomColorPicker
          value={colors[channel]}
          label={`${control.label} ${names[channel]}`}
          {disabled}
          onchange={changeColor}
        />{/key}
    </div>
    <p class="dye-name">{names[channel]} · {rgbHex(colors[channel]).toUpperCase()}</p>
    {#if control.activeChannels?.some((active) => !active)}<p class="unused-channels">
        {names.filter((_, index) => control.activeChannels?.[index] === false).join(', ')} is not used
        by this item.
      </p>{/if}
  {/if}
  <button
    type="button"
    class="reset"
    onclick={() => {
      control.reset();
      revision++;
    }}>Reset colors</button
  >
</fieldset>

<style>
  .dye-control {
    min-width: 0;
    margin-top: 0.85rem;
    padding: 0.65rem;
    border: 1px solid var(--color-surface-400);
    border-radius: 0.4rem;
    background: var(--color-surface-700);
  }
  legend {
    padding: 0 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .mode-switch {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.7rem;
  }
  .mode-switch label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    cursor: pointer;
  }
  input[type='radio'] {
    width: 16px;
    height: 16px;
    accent-color: var(--color-primary-500);
  }
  .color-wheel {
    margin-left: auto;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  }
  .dye-search {
    width: 100%;
    min-width: 0;
    margin-bottom: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: var(--color-surface-800);
    border: 1px solid var(--color-surface-400);
    color: var(--color-surface-50);
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }
  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 3px;
    max-height: 174px;
    overflow-y: auto;
    padding: 3px;
    scrollbar-width: thin;
  }
  .swatch {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    min-width: 0;
    padding: 0;
    border: 1px solid var(--color-surface-400);
    border-radius: 0.2rem;
    cursor: pointer;
  }
  .swatch :global(svg) {
    color: white;
    filter: drop-shadow(1px 0 0 #000) drop-shadow(-1px 0 0 #000) drop-shadow(0 1px 0 #000)
      drop-shadow(0 -1px 0 #000);
  }
  .swatch[aria-pressed='true'] {
    border-color: var(--color-primary-500);
  }
  .swatch:hover {
    box-shadow: inset 0 0 0 2px white;
  }
  .dye-name {
    font-size: 0.7rem;
    min-height: 1.3rem;
    margin: 0.45rem 0 0;
    color: var(--color-surface-200);
  }
  .custom-layout {
    display: flex;
    gap: 0.5rem;
    min-width: 0;
  }
  .channel-switch {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 32px;
    flex-shrink: 0;
  }
  .reset {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    padding: 0.25rem 0.45rem;
    border: 1px solid var(--color-surface-400);
    border-radius: 0.25rem;
    color: var(--color-surface-50);
    background: var(--color-surface-800);
    cursor: pointer;
  }
  .unused-channels {
    font-size: 0.7rem;
    color: var(--color-surface-300);
    margin: 0 0 0.4rem;
  }
  .no-colors {
    grid-column: 1/-1;
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  :is(button, input):focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
  :disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>
