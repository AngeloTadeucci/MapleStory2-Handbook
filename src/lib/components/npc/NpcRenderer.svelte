<script lang="ts">
  import getGltfUrl from '$lib/getGltfUrl';
  import type { Npc } from '$lib/types/Npc';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { Combobox, Portal, useListCollection } from '@skeletonlabs/skeleton-svelte';
  import { onMount } from 'svelte';

  type RendererProps = {
    npc: Npc;
    customStyle?: string;
    advancedControls?: boolean;
  };
  let { npc, customStyle, advancedControls = false }: RendererProps = $props();

  const gltfUrl = getGltfUrl();
  const iconPath = $derived(`/${npc.portrait.split('/').slice(2).join('/')}`);

  let validAnimations: string[] = $state([]);
  let selectedAnimation = $state('');
  let loadingGltf = $state(true);
  let orientation = $state('');
  let cameraTarget = $state('');
  let customOrbit = $state('');

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
        npc.animations.map(async (animation: string) => {
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
  <div class="mx-4 mt-2 flex items-center gap-5">
    <div class="flex w-1/2 flex-col">
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
    <button
      class="button absolute right-5 top-5 z-10"
      onclick={() => window.open(`/npcs/${npc.id}/model`)}
    >
      <img src={'/icons/open_in_new.svg'} alt="Open in new tab" title="Open in new tab" />
    </button>
  </div>
  <model-viewer
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
