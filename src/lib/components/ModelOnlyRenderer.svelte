<script lang="ts">
  import type { Npc } from '$lib/types/Npc';
  import { Combobox, Dialog, Portal, Slider, useListCollection } from '@skeletonlabs/skeleton-svelte';
  import { onMount } from 'svelte';
  import { url } from '../helpers/addBasePath';
  import CreateGifModal from './CreateGifModal.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import getGltfUrl from '$lib/getGltfUrl';

  type RendererProps = {
    npc: Npc;
    customStyle?: string;
  };
  let { npc, customStyle }: RendererProps = $props();

  let confirmDialogOpen = $state(false);
  let gifModalOpen = $state(false);

  const gltfUrl = getGltfUrl();
  const iconPath = $derived(url(`/${npc.portrait.split('/').slice(2).join('/')}`));

  let validAnimations: string[] = $state([]);
  let selectedAnimation = $state('');
  let animationSpeed: number = $state(1);

  // Combobox setup for animation selection
  let animationItems = $state<{ label: string; value: string }[]>([]);

  const animationCollection = $derived(
    useListCollection({
      items: animationItems,
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value
    })
  );

  // Update animationItems when validAnimations changes
  $effect(() => {
    const defaultOption = { label: 'Default', value: npc.kfm };
    const animOptions = validAnimations.map((anim) => ({ label: anim, value: anim }));
    animationItems = [defaultOption, ...animOptions];
  });

  const handleAnimationChange = (details: { value: string[] }) => {
    if (details.value.length > 0) {
      selectedAnimation = details.value[0];
    }
  };

  const handleAnimationInputChange = (details: { inputValue: string }) => {
    const defaultOption = { label: 'Default', value: npc.kfm };
    const animOptions = validAnimations.map((anim) => ({ label: anim, value: anim }));
    const allOptions = [defaultOption, ...animOptions];

    const filtered = allOptions.filter((item) =>
      item.label.toLowerCase().includes(details.inputValue.toLowerCase())
    );
    animationItems = filtered.length > 0 ? filtered : allOptions;
  };

  const handleAnimationOpenChange = () => {
    const defaultOption = { label: 'Default', value: npc.kfm };
    const animOptions = validAnimations.map((anim) => ({ label: anim, value: anim }));
    animationItems = [defaultOption, ...animOptions];
  };
  let loadingGltf = $state(true);
  let orientation = $state('');
  let cameraTarget = '';
  let customOrbit = '';
  let customSize = $state(false);

  onMount(async () => {
    orientation = '0deg -90deg 0deg';
    selectedAnimation = npc.kfm;

    try {
      const response = await fetch(`${gltfUrl}${npc.kfm}/${npc.kfm}.gltf`, {
        method: 'HEAD'
      });
      if (!response.ok) {
        loadingGltf = false;
        return;
      }

      const tempAnimations: string[] = [];
      await Promise.all(
        npc.animations.map(async (animation: any) => {
          const response = await fetch(`${gltfUrl}${npc.kfm}/${animation}.gltf`);

          if (response.ok) {
            tempAnimations.push(animation);
          }
        })
      );
      // order animations alphabetically and assign to reactive state
      tempAnimations.sort((a, b) => a.localeCompare(b));
      validAnimations = tempAnimations;
    } catch {}
    loadingGltf = false;
  });

  let modelViewer: any = $state();
  $effect(() => {
    if (modelViewer) {
      modelViewer.timeScale = animationSpeed;
    }
  });

  let playing = $state(true);
  const playPause = () => {
    if (modelViewer) {
      if (playing) {
        modelViewer.pause();
        frameStep = modelViewer.currentTime;
      } else {
        modelViewer.play();
      }
      playing = !playing;
    }
  };

  const reset = () => {
    if (modelViewer) {
      modelViewer.currentTime = 0;
      modelViewer.pause();
      playing = false;
      frameStep = 0;
    }
  };
  let frameStep = $state(0);
  let animationDuration = $state(0);

  // Update animationDuration when modelViewer is ready or animation changes
  $effect(() => {
    // Track selectedAnimation to re-run when it changes
    void selectedAnimation;
    if (!modelViewer) return;

    // Reset and start polling for new duration
    let currentDuration = 0;

    const checkDuration = () => {
      if (modelViewer && modelViewer.duration > 0) {
        currentDuration = modelViewer.duration;
        animationDuration = currentDuration;
      }
    };

    // Check immediately and also on interval until we get a duration
    checkDuration();
    const intervalId = setInterval(() => {
      checkDuration();
      if (currentDuration > 0) {
        clearInterval(intervalId);
      }
    }, 100);

    return () => clearInterval(intervalId);
  });

  // Update animation from frameStep when paused (user drags slider)
  $effect(() => {
    if (modelViewer && !playing && frameStep > 0) {
      modelViewer.currentTime = frameStep / animationSpeed;
    }
  });

  // Update frameStep from animation when playing using interval
  $effect(() => {
    if (!playing || !modelViewer) return;

    const intervalId = setInterval(() => {
      if (modelViewer && modelViewer.currentTime !== undefined) {
        frameStep = modelViewer.currentTime * animationSpeed;
      }
    }, 50);

    return () => clearInterval(intervalId);
  });

  let lastAnimation: string | undefined = '';
  $effect(() => {
    if (modelViewer && selectedAnimation !== lastAnimation) {
      modelViewer.animationName = selectedAnimation;
      lastAnimation = selectedAnimation;
      playing = true;
      animationDuration = 0; // Reset so it gets recalculated for new animation
      frameStep = 0;
    }
  });

  const openGifModal = async () => {
    if (selectedAnimation == npc.kfm) {
      confirmDialogOpen = true;
      return;
    }
    gifModalOpen = true;
  };

  const handleScreenshot = () => {
    const blob = modelViewer.toDataURL();
    const a = document.createElement('a');
    a.href = blob;
    a.download = `${npc.name}.png`;
    a.click();
    confirmDialogOpen = false;
  };

  let rgb: string = $state('#35171f');
  let width: number = $state(300);
  let height: number = $state(300);

  $effect(() => {
    customStyle = `${
      customSize
        ? `resize: both; overflow: auto; width: ${width}px; height: ${height}px;`
        : 'width: 100%; height: 100%;'
    } background-color: ${rgb}`;
  });

  export const ssr = false;
</script>

<svelte:head>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js">
  </script>
</svelte:head>

{#if loadingGltf}
  <div class="flex items-center justify-center">
    <LoadingSpinner />
  </div>
{:else}
  <div class="block min-h-screen flex-row md:flex">
    <div class="flex h-[40vh] items-center justify-center bg-surface-600 md:h-auto md:w-[70%]">
      <model-viewer
        bind:this={modelViewer}
        src="{gltfUrl}{npc.kfm}/{selectedAnimation}.gltf"
        alt={npc.name}
        camera-controls
        {...{ cameraTarget, customOrbit, orientation }}
        autoplay
        max-field-of-view="70deg"
        touch-action="pan-y"
        interaction-prompt="none"
        style={customStyle ?? `width: 550px; height: 760px; --iconPath: url(${iconPath});`}
      ></model-viewer>
    </div>

    <div class="h-[60vh] overflow-auto p-4 md:h-auto md:w-[30%] md:overflow-hidden">
      <div class="flex flex-col items-center gap-5">
        <div class="flex w-full flex-col">
          <span class="font-bold">Change animation</span>
          <Combobox
            collection={animationCollection}
            value={[selectedAnimation]}
            onValueChange={handleAnimationChange}
            onInputValueChange={handleAnimationInputChange}
            onOpenChange={handleAnimationOpenChange}
            openOnClick
          >
            <Combobox.Control class="w-full bg-surface-700 border-transparent rounded-md p-2 flex items-center cursor-pointer">
              <Combobox.Input class="w-full bg-transparent text-surface-50 placeholder:text-surface-400 border-none focus:ring-0 cursor-pointer" />
              <Combobox.Trigger class="text-surface-400 hover:text-surface-50" />
            </Combobox.Control>
            <Portal>
              <Combobox.Positioner>
                <Combobox.Content class="bg-surface-700 border border-surface-600 rounded-md shadow-xl z-50">
                  {#each animationItems as item (item.value)}
                    <Combobox.Item {item} class="flex items-center justify-between text-surface-50 hover:bg-surface-600 data-highlighted:bg-surface-600 data-[state=checked]:bg-primary-500 data-[state=checked]:text-surface-950 px-3 py-2 cursor-pointer">
                      <Combobox.ItemText>{item.label}</Combobox.ItemText>
                      <Combobox.ItemIndicator />
                    </Combobox.Item>
                  {/each}
                </Combobox.Content>
              </Combobox.Positioner>
            </Portal>
          </Combobox>
        </div>
        {#if validAnimations.length > 0}
          <div class="flex w-full flex-col">
            <Slider
              value={[animationSpeed]}
              onValueChange={(details) => { animationSpeed = details.value[0]; }}
              max={5}
              step={0.1}
              min={0.1}
            >
              <div class="flex items-center justify-between">
                <Slider.Label class="font-bold">Change animation speed</Slider.Label>
                <div class="text-xs">{animationSpeed} / {5}</div>
              </div>
              <Slider.Control class="mt-2 relative flex items-center">
                <Slider.Track class="h-2 w-full rounded-full bg-surface-400">
                  <Slider.Range class="h-2 rounded-full bg-primary-500" />
                </Slider.Track>
                <Slider.Thumb index={0} class="size-5 rounded-full bg-primary-500 border-2 border-white shadow-md cursor-pointer">
                  <Slider.HiddenInput />
                </Slider.Thumb>
              </Slider.Control>
            </Slider>
          </div>
        {/if}
        <div class="flex w-full flex-col">
          <span class="font-bold">Change background color</span>
          <input type="color" bind:value={rgb} class="w-full" />
        </div>
      </div>
      <div class="flex w-full justify-between gap-4 py-4">
        <div>
          <button class="btn-icon bg-surface-800 hover:preset-filled-surface-600" onclick={playPause}>
            {#if playing}
              <img src="/icons/pause_circle.svg" alt="Pause" width="35" title="Pause" />
            {:else}
              <img src="/icons/play_circle.svg" alt="Play" width="35" title="Play" />
            {/if}
          </button>
          <button class="btn-icon bg-surface-800 hover:preset-filled-surface-600" onclick={reset}>
            <img src="/icons/stop_circle.svg" alt="Stop" width="35" title="Stop" />
          </button>
        </div>
      </div>
      <Slider
        min={0}
        max={animationDuration ? animationDuration * animationSpeed : 1}
        step={0.01}
        value={[frameStep]}
        onValueChange={(details) => { frameStep = details.value[0]; }}
        disabled={playing || !animationDuration}
      >
        <div class="flex items-center justify-between">
          <Slider.Label class="font-bold">Frame:</Slider.Label>
          <div class="text-xs">
            {(frameStep / animationSpeed).toFixed(2)} / {(
              (animationDuration || 1) / animationSpeed
            ).toFixed(2)}
          </div>
        </div>
        <Slider.Control class="mt-2 relative flex items-center">
          <Slider.Track class="h-2 w-full rounded-full bg-surface-400">
            <Slider.Range class="h-2 rounded-full bg-primary-500" />
          </Slider.Track>
          <Slider.Thumb index={0} class="size-5 rounded-full bg-primary-500 border-2 border-white shadow-md cursor-pointer disabled:bg-surface-400 disabled:opacity-50">
            <Slider.HiddenInput />
          </Slider.Thumb>
        </Slider.Control>
      </Slider>

      <div class="mt-4">
        <label class="flex items-center space-x-2">
          <input class="checkbox" type="checkbox" bind:checked={customSize} />
          <p>Enable resize</p>
        </label>
      </div>
      {#if customSize}
        <p class="mt-4">Change the size of the canvas in pixels</p>
        <div class="flex gap-4">
          <label class="label">
            <span>Height</span>
            <input class={`input`} type="number" placeholder="Height" bind:value={height} />
          </label>
          <label class="label">
            <span>Width</span>
            <input class={`input`} type="number" placeholder="Width" bind:value={width} />
          </label>
        </div>
      {/if}

      <button onclick={openGifModal} class="btn preset-filled mt-4" type="button">
        Create GIF
      </button>
    </div>
  </div>
{/if}

<!-- Confirm Dialog for Screenshot -->
<Dialog open={confirmDialogOpen} onOpenChange={(details) => { confirmDialogOpen = details.open; }}>
  <Portal>
    <Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-950/50" />
    <Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Dialog.Content class="card bg-surface-800 w-full max-w-md p-6 space-y-4">
        <Dialog.Title class="text-xl font-bold">No animation selected!?</Dialog.Title>
        <Dialog.Description>Want to take a screenshot instead?</Dialog.Description>
        <footer class="flex justify-end gap-2 pt-4">
          <Dialog.CloseTrigger class="btn preset-tonal">Cancel</Dialog.CloseTrigger>
          <button class="btn preset-filled-primary" onclick={handleScreenshot}>
            Take Screenshot
          </button>
        </footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog>

<!-- GIF Modal -->
<CreateGifModal
  {npc}
  {modelViewer}
  {selectedAnimation}
  open={gifModalOpen}
  onClose={() => gifModalOpen = false}
/>

<style>
  /* Fix Skeleton Slider thumb vertical alignment */
  :global([data-scope="slider"][data-part="thumb"]) {
    top: 50%;
    transform: translateX(-50%) translateY(-50%) !important;
  }

  #lazy-load-poster {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-image: var(--iconPath);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
  #button-load {
    background-image: url('/icons/file_download.svg');
    background-repeat: no-repeat;
    background-size: 24px 24px;
    background-position: 6% 50%;
    background-color: #000;
    color: white;
    cursor: pointer;
    border-radius: 6px;
    display: inline-block;
    padding: 10px 18px 9px 40px;
    font-weight: 500;
    box-shadow:
      0 0 8px rgba(0, 0, 0, 0.2),
      0 0 4px rgba(0, 0, 0, 0.25);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%, -50%, 0);
    z-index: 100;
  }
</style>
