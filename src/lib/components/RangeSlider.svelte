<script lang="ts">
  import { Slider } from '@skeletonlabs/skeleton-svelte';

  interface Props {
    label: string;
    min: number;
    max: number;
    value: number[];
    onValueChange: (details: { value: number[] }) => void;
    step?: number;
  }

  let { label, min, max, value, onValueChange, step = 1 }: Props = $props();
</script>

<div class="w-full">
  <Slider {min} {max} {value} {onValueChange} {step}>
    <div class="flex items-center justify-between mb-2">
      <Slider.Label>{label}</Slider.Label>
      <div class="text-xs">{value[0]} - {value[1]}</div>
    </div>
    <Slider.Control class="relative flex items-center h-11">
      <Slider.Track class="h-2 w-full rounded-full bg-surface-400">
        <Slider.Range class="h-2 rounded-full bg-primary-500" />
      </Slider.Track>
      <Slider.Thumb index={0} class="size-5 rounded-full bg-primary-500 border-2 border-white shadow-md cursor-pointer">
        <Slider.HiddenInput />
      </Slider.Thumb>
      <Slider.Thumb index={1} class="size-5 rounded-full bg-primary-500 border-2 border-white shadow-md cursor-pointer">
        <Slider.HiddenInput />
      </Slider.Thumb>
    </Slider.Control>
  </Slider>
</div>

<style>
  /* Fix Skeleton Slider thumb vertical alignment */
  :global([data-scope="slider"][data-part="thumb"]) {
    top: 50%;
    transform: translateX(-50%) translateY(-50%) !important;
  }
</style>
