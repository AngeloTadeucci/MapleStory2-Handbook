<script script lang="ts">
  import { env } from '$env/dynamic/public';
  import type { Npc } from '$lib/types/Npc';
  import {
    ProgressRadial,
    RangeSlider,
    modalStore,
    type ModalComponent,
    type ModalSettings
  } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { url } from '../helpers/addBasePath';
  import CreateGifModal from './CreateGifModal.svelte';

  type RendererProps = {
    npc: Npc;
    customStyle?: string;
  };
  export let { npc, customStyle } = {} as RendererProps;

  const gltfUrl = env.PUBLIC_NODE_ENV === 'development' ? '/gltf/' : env.PUBLIC_MODELS_URL;
  const iconPath = url(`/${npc.portrait.split('/').slice(2).join('/')}`);

  let validAnimations: string[] = [];
  let selectedAnimation = '';
  let animationSpeed: number = 1;
  let loadingGltf = true;
  let orientation = '';
  let cameraTarget = '';
  let customOrbit = '';
  let customSize = false;

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

      await Promise.all(
        npc.animations.map(async (animation: any) => {
          const response = await fetch(`${gltfUrl}${npc.kfm}/${animation}.gltf`);

          if (response.ok) {
            validAnimations.push(animation);
          }
        })
      );
    } catch {}
    // order animations alphabetically
    validAnimations.sort((a, b) => a.localeCompare(b));
    loadingGltf = false;
  });

  let modelViewer: any;
  $: if (modelViewer) {
    modelViewer.timeScale = animationSpeed;
  }

  let playing = true;
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
  let frameStep = 0;
  $: if (modelViewer && frameStep > 0 && !playing) {
    modelViewer.currentTime = frameStep / animationSpeed;
  }

  let lastAnimation: string | undefined = '';
  $: if (modelViewer && selectedAnimation !== lastAnimation) {
    modelViewer.animationName = selectedAnimation;
    lastAnimation = selectedAnimation;
    playing = true;
  }

  const openGifModal = async () => {
    if (selectedAnimation == npc.kfm) {
      const modal: ModalSettings = {
        type: 'confirm',
        title: 'No animation selected!?',
        body: 'Want to take a screenshot instead?',
        response: (r: boolean) => {
          if (!r) {
            return;
          }

          const blob = modelViewer.toDataURL();
          const a = document.createElement('a');
          a.href = blob;
          a.download = `${npc.name}.png`;
          a.click();
        }
      };
      modalStore.trigger(modal);
      return;
    }
    const modalComponent: ModalComponent = {
      ref: CreateGifModal,
      props: {
        npc,
        selectedAnimation,
        modelViewer
      },
      slot: '<p>Skeleton</p>'
    };

    const modal: ModalSettings = {
      type: 'component',
      component: modalComponent
    };

    modalStore.trigger(modal);
    return;
  };

  let rgb: string = '#35171f';
  let width: number = 300;
  let height: number = 300;

  $: customStyle = `${
    customSize
      ? `resize: both; overflow: auto; width: ${width}px; height: ${height}px;`
      : 'width: 100%; height: 100%;'
  } background-color: ${rgb}`;

  export const ssr = false;
</script>

<svelte:head>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js">
  </script>
</svelte:head>

{#if loadingGltf}
  <div class="flex items-center justify-center">
    <ProgressRadial width="w-32" />
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
      />
    </div>

    <div class="h-[60vh] overflow-auto p-4 md:h-auto md:w-[30%] md:overflow-hidden">
      <div class="flex flex-col items-center gap-5">
        <div class="flex w-full flex-col">
          <span class="font-bold">Change animation</span>
          <select class="select mb-2 border border-gray2 p-2" bind:value={selectedAnimation}>
            <option value={npc.kfm}>Default</option>
            {#each validAnimations as animation}
              <option value={animation}>{animation}</option>
            {/each}
          </select>
        </div>
        {#if validAnimations.length > 0}
          <div class="flex w-full flex-col">
            <RangeSlider
              name="range-slider"
              bind:value={animationSpeed}
              max={5}
              step={0.1}
              min={0.1}
            >
              <div class="flex items-center justify-between">
                <div class="font-bold">Change animation speed</div>
                <div class="text-xs">{animationSpeed} / {5}</div>
              </div>
            </RangeSlider>
          </div>
        {/if}
        <div class="flex w-full flex-col">
          <span class="font-bold">Change background color</span>
          <input type="color" bind:value={rgb} class="w-[100%]" />
        </div>
      </div>
      <div class="flex w-full justify-between gap-4 py-4">
        <div>
          <button class="btn-icon variant-filled-surface" on:click={playPause}>
            {#if playing}
              <img src="/icons/pause_circle.svg" alt="Pause" width="35" title="Pause" />
            {:else}
              <img src="/icons/play_circle.svg" alt="Play" width="35" title="Play" />
            {/if}
          </button>
          <button class="btn-icon variant-filled-surface" on:click={reset}>
            <img src="/icons/stop_circle.svg" alt="Stop" width="35" title="Stop" />
          </button>
        </div>
      </div>
      {#if modelViewer && modelViewer.duration > 0}
        <RangeSlider
          name="frame"
          min={0.0}
          max={Number((modelViewer.duration / animationSpeed).toFixed(2))}
          step={0.01}
          bind:value={frameStep}
          disabled={playing}
        >
          <div class="flex items-center justify-between">
            <div class="font-bold">Frame:</div>
            <div class="text-xs">
              {(frameStep / animationSpeed).toFixed(2)} / {(
                modelViewer.duration / animationSpeed
              ).toFixed(2)}
            </div>
          </div>
        </RangeSlider>
      {:else}
        <!-- fake range slider so layout doesnt jump. RangeSlide above only updates when we pause the animation, idk why -->
        <RangeSlider name="frame" min={0.0} max={1} step={0.01} disabled={true}>
          <div class="flex items-center justify-between">
            <div class="font-bold">Frame:</div>
            <div class="text-xs">
              {0} / {1}
            </div>
          </div>
        </RangeSlider>
      {/if}

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

      <button on:click={openGifModal} class="btn variant-filled mt-4" type="button">
        Create GIF
      </button>
    </div>
  </div>
{/if}

<style>
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
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.25);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%, -50%, 0);
    z-index: 100;
  }
</style>
