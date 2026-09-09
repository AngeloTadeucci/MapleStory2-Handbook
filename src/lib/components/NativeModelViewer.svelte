<script lang="ts">
  import type { StandaloneScene } from '$lib/models/StandaloneScene';
  import type { NativeAsset } from '$lib/nativeAssets';
  let {
    url,
    label,
    asset,
    style = 'width: 100%; height: 100%;',
    onready
  }: {
    url: string;
    label: string;
    asset?: NativeAsset;
    style?: string;
    onready?: (viewer: StandaloneScene | undefined) => void;
  } = $props();
  let element: HTMLDivElement;
  let loading = $state(true);
  let error = $state('');
  $effect(() => {
    const source = url;
    const face =
      asset?.facePreset && asset.customizationUrl
        ? { preset: asset.facePreset, customizationUrl: asset.customizationUrl }
        : undefined;
    let scene: StandaloneScene | undefined;
    let cancelled = false;
    loading = true;
    error = '';
    void import('$lib/models/StandaloneScene')
      .then(async ({ StandaloneScene }) => {
        if (cancelled) return;
        scene = new StandaloneScene(element);
        await scene.load(source, face);
        if (!cancelled) {
          loading = false;
          onready?.(scene);
        }
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        loading = false;
        error = reason instanceof Error ? reason.message : 'Unable to load model';
        scene?.dispose();
      });
    return () => {
      cancelled = true;
      onready?.(undefined);
      scene?.dispose();
    };
  });
</script>

<div class="native-model" {style} role="img" aria-label={label} aria-busy={loading}>
  <div class="canvas" bind:this={element}></div>
  {#if loading}<p class="status" role="status">Loading model…</p>{/if}
  {#if error}<p class="status" role="alert">{error}</p>{/if}
</div>

<style>
  .native-model {
    position: relative;
    min-height: 100px;
  }
  .canvas {
    width: 100%;
    height: 100%;
  }
  .status {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    pointer-events: none;
  }
</style>
