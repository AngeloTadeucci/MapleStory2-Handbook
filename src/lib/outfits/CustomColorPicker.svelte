<script lang="ts">
  import type { Rgb } from './materialColors';
  import { hsvToRgb, rgbToHsv, rgbHex } from './dyePicker';
  let {
    value,
    label,
    disabled = false,
    onchange
  }: { value: Rgb; label: string; disabled?: boolean; onchange: (color: Rgb) => void } = $props();
  let hue = $state(0),
    saturation = $state(0),
    brightness = $state(1);
  $effect(() => {
    const next = rgbToHsv(value);
    if (next.s > 0) hue = next.h;
    if (next.v > 0) saturation = next.s;
    brightness = next.v;
  });
  function update() {
    onchange(hsvToRgb({ h: hue, s: saturation, v: brightness }));
  }
  function point(event: PointerEvent) {
    if (disabled) return;
    const node = event.currentTarget as HTMLElement;
    if (event.type === 'pointerdown') node.setPointerCapture(event.pointerId);
    else if (!node.hasPointerCapture(event.pointerId)) return;
    const box = node.getBoundingClientRect();
    hue = Math.max(0, Math.min(359.99, ((event.clientX - box.left) / box.width) * 360));
    saturation = 1 - Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    update();
  }
  function keys(event: KeyboardEvent) {
    if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') hue = (hue - step + 360) % 360;
    if (event.key === 'ArrowRight') hue = (hue + step) % 360;
    if (event.key === 'ArrowUp') saturation = Math.min(1, saturation + step / 100);
    if (event.key === 'ArrowDown') saturation = Math.max(0, saturation - step / 100);
    update();
  }
</script>

<div class="custom-picker">
  <div class="spectrum-row">
    <div
      class="spectrum"
      role="slider"
      tabindex={disabled ? -1 : 0}
      aria-label={`${label} hue and saturation`}
      aria-disabled={disabled}
      aria-valuemin="0"
      aria-valuemax="360"
      aria-valuenow={Math.round(hue)}
      aria-valuetext={`${Math.round(hue)} degrees, ${Math.round(saturation * 100)}% saturation`}
      onpointerdown={point}
      onpointermove={point}
      onkeydown={keys}
    >
      <div class="darken" style:opacity={1 - brightness}></div>
      <span
        class="cursor"
        style:left={`${(hue / 360) * 100}%`}
        style:top={`${(1 - saturation) * 100}%`}
      ></span>
    </div>
    <input
      class="brightness"
      type="range"
      min="0"
      max="1"
      step="0.001"
      {disabled}
      aria-label={`${label} brightness`}
      value={brightness}
      style:background={`linear-gradient(to top, #000, ${rgbHex(hsvToRgb({ h: hue, s: saturation, v: 1 }))})`}
      oninput={(event) => {
        brightness = event.currentTarget.valueAsNumber;
        update();
      }}
    />
  </div>
  <div class="rgb-fields">
    {#each ['R', 'G', 'B'] as channel, index}<label
        >{channel}<input
          type="number"
          min="0"
          max="255"
          step="1"
          {disabled}
          aria-label={`${label} ${channel}`}
          value={Math.round(value[index] * 255)}
          onchange={(event) => {
            const number = event.currentTarget.valueAsNumber;
            if (!Number.isFinite(number)) {
              event.currentTarget.value = String(Math.round(value[index] * 255));
              return;
            }
            const next = [...value] as Rgb;
            next[index] = Math.round(Math.max(0, Math.min(255, number))) / 255;
            onchange(next);
          }}
        /></label
      >{/each}
  </div>
</div>

<style>
  .custom-picker {
    min-width: 0;
    flex: 1;
  }
  .spectrum-row {
    display: flex;
    gap: 0.4rem;
    height: 145px;
  }
  .spectrum {
    position: relative;
    flex: 1;
    min-width: 0;
    touch-action: none;
    cursor: crosshair;
    border: 1px solid var(--color-surface-400);
    border-radius: 0.25rem;
    background:
      linear-gradient(to top, white, transparent),
      linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  }
  .darken {
    position: absolute;
    inset: 0;
    background: black;
    pointer-events: none;
  }
  .cursor {
    position: absolute;
    width: 10px;
    height: 10px;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 1px #000;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .brightness {
    appearance: none;
    writing-mode: vertical-lr;
    direction: rtl;
    width: 20px;
    min-width: 20px;
    height: 100%;
    padding: 0;
    border: 1px solid var(--color-surface-400);
    border-radius: 0.2rem;
    cursor: ns-resize;
  }
  .brightness::-webkit-slider-thumb {
    appearance: none;
    width: 26px;
    height: 5px;
    background: white;
    border: 1px solid black;
    border-radius: 2px;
  }
  .brightness::-moz-range-thumb {
    width: 26px;
    height: 5px;
    background: white;
    border: 1px solid black;
    border-radius: 2px;
  }
  .rgb-fields {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.65rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    min-width: 0;
  }
  input[type='number'] {
    width: 100%;
    min-width: 0;
    padding: 0.25rem;
    background: var(--color-surface-800);
    border: 1px solid var(--color-surface-400);
    border-radius: 0.25rem;
    color: var(--color-surface-50);
    font-size: 0.75rem;
    appearance: textfield;
  }
  input[type='number']::-webkit-inner-spin-button {
    appearance: none;
  }
  :is(input, .spectrum):focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 3px;
  }
</style>
