<script lang="ts">
  import type { Npc } from '$lib/types/Npc';
  import type { ZodIssue } from 'zod';
  import { gifSchema } from '$lib/schemas/gif';
  import { PUBLIC_GIFS_URL } from '$env/static/public';
  import { Dialog, Portal, Combobox, useListCollection } from '@skeletonlabs/skeleton-svelte';

  type CreateGifProps = {
    npc: Npc;
    modelViewer: any;
    selectedAnimation: string;
    open: boolean;
    onClose: () => void;
  };
  let { npc, modelViewer, selectedAnimation, open, onClose }: CreateGifProps = $props();

  let resize = $state(false);
  let loading = $state(false);
  let statusMessage = $state('');
  let errorMessage = $state('');

  const formData = $state({
    framerate: 15,
    height: 400,
    width: 400,
    quality: 70
  });

  // Framerate dropdown items
  const framerateItems = [
    { label: '15', value: 15 },
    { label: '30', value: 30 },
    { label: '50', value: 50 }
  ];

  const framerateCollection = $derived(
    useListCollection({
      items: framerateItems,
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value.toString()
    })
  );

  const handleFramerateChange = (details: { value: string[] }) => {
    if (details.value.length > 0) {
      formData.framerate = parseInt(details.value[0]);
    }
  };

  $effect(() => {
    if (modelViewer) {
      formData.height = modelViewer.offsetHeight || 400;
      formData.width = modelViewer.offsetWidth || 400;
    }
  });

  let errors: ZodIssue[] = $state([]);

  // Compress and resize image to reduce payload size
  async function compressImage(
    dataUrl: string,
    maxWidth: number,
    maxHeight: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG with 0.85 quality - much smaller than PNG
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!modelViewer) {
      onClose();
      return;
    }

    errors = [];
    errorMessage = '';
    const validation = gifSchema.safeParse(formData);
    if (!validation.success) {
      errors = validation.error.issues;
      return;
    }
    loading = true;
    statusMessage = 'Taking screenshots...';

    modelViewer.pause();
    modelViewer.currentTime = 0;
    const screenshots: string[] = [];
    const duration = modelViewer.duration;

    // Limit max dimensions to reduce payload (max 512px to keep quality reasonable but size low)
    const maxDimension = 512;
    const targetWidth = Math.min(formData.width, maxDimension);
    const targetHeight = Math.min(formData.height, maxDimension);

    const iIncrease = 1 / formData.framerate;
    for (let i = 0.0; i < duration; i += iIncrease) {
      modelViewer.currentTime = i;
      await new Promise((resolve) => setTimeout(resolve, 50));
      const blob = modelViewer.toDataURL();
      // Compress each screenshot immediately
      const compressed = await compressImage(blob, targetWidth, targetHeight);
      screenshots.push(compressed);
    }

    if (screenshots.length === 0) {
      loading = false;
      modelViewer.play();
      return;
    }
    modelViewer.play();

    statusMessage = 'Uploading frames...';

    try {
      const response = await fetch(`/api/gif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: npc.kfm,
          animation: selectedAnimation,
          screenshots,
          ...formData
        })
      });

      loading = false;

      if (response.ok) {
        const { url } = await response.json();
        window.open(PUBLIC_GIFS_URL + url, '_blank');
        onClose();
      } else if (response.status === 413) {
        errorMessage =
          'The animation is too long or high quality. Try reducing framerate, quality, or resizing to smaller dimensions.';
      } else {
        const data = await response.json().catch(() => ({ message: 'Unknown error' }));
        errorMessage = data.message || 'Failed to create GIF';
      }
    } catch (err) {
      loading = false;
      errorMessage = err instanceof Error ? err.message : 'Network error. Please try again.';
    }
  };

  function handleClose() {
    onClose();
  }
</script>

<Dialog
  {open}
  onOpenChange={(details) => {
    if (!details.open) handleClose();
  }}
>
  <Portal>
    <Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-950/50" />
    <Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Dialog.Content class="card bg-surface-800 w-full max-w-lg p-4 space-y-4 shadow-xl">
        <Dialog.Title class="text-2xl font-bold">Create GIF</Dialog.Title>
        {#if errorMessage}
          <div class="p-3 bg-error-500/20 border border-error-500 rounded text-error-300">
            {errorMessage}
          </div>
        {/if}
        <article>
          <h3>How does this work?</h3>
          <ul class="my-4 ml-4 list-disc">
            <li>
              The gif will be created from the current animation, camera position and canvas size.
            </li>
            <li>
              The browser will take a screenshot of the canvas for every frame and then send them
              for processing.
            </li>
            <li>Don't worry about the background, it will be transparent.</li>
            <li>
              The processing may take a while, depending on the length of the animation and the
              quality you choose.
            </li>
            <li>All gifs will be deleted after 24 hours. Make sure you download it!</li>
          </ul>
          <div class="flex w-full flex-col">
            <span class="font-bold">Framerate</span>
            <Combobox
              collection={framerateCollection}
              value={[formData.framerate.toString()]}
              onValueChange={handleFramerateChange}
              openOnClick
            >
              <Combobox.Control
                class="w-full bg-surface-700 border-transparent rounded-md p-2 flex items-center cursor-pointer"
              >
                <Combobox.Input
                  class="w-full bg-transparent text-surface-50 placeholder:text-surface-400 border-none focus:ring-0 cursor-pointer"
                />
                <Combobox.Trigger class="text-surface-400 hover:text-surface-50" />
              </Combobox.Control>
              <Portal>
                <Combobox.Positioner>
                  <Combobox.Content
                    class="bg-surface-700 border border-surface-600 rounded-md shadow-xl z-50"
                  >
                    {#each framerateItems as item (item.value)}
                      <Combobox.Item
                        {item}
                        class="flex items-center justify-between text-surface-50 hover:bg-surface-600 data-highlighted:bg-surface-600 data-[state=checked]:bg-primary-500 data-[state=checked]:text-surface-950 px-3 py-2 cursor-pointer"
                      >
                        <Combobox.ItemText>{item.label}</Combobox.ItemText>
                        <Combobox.ItemIndicator />
                      </Combobox.Item>
                    {/each}
                  </Combobox.Content>
                </Combobox.Positioner>
              </Portal>
            </Combobox>
            {#if errors.find((e) => e.path[0] === 'framerate')}
              <p class="text-error-500">{errors.find((e) => e.path[0] === 'framerate')?.message}</p>
            {/if}
          </div>
          <label class="mt-4 flex items-center space-x-2">
            <input class="checkbox" type="checkbox" bind:checked={resize} />
            <p>Resize final render</p>
          </label>
          <div class="mt-4 flex gap-4">
            <label class="label">
              <span>Height in pixels</span>
              <input
                class={`input ${errors.find((e) => e.path[0] === 'height') ? 'input-error' : ''}`}
                type="number"
                placeholder="Height"
                bind:value={formData.height}
                disabled={!resize}
              />
              {#if errors.find((e) => e.path[0] === 'height')}
                <p class="text-error-500">{errors.find((e) => e.path[0] === 'height')?.message}</p>
              {/if}
            </label>
            <label class="label">
              <span>Width in pixels</span>
              <input
                class={`input ${errors.find((e) => e.path[0] === 'width') ? 'input-error' : ''}`}
                type="number"
                placeholder="Width"
                bind:value={formData.width}
                disabled={!resize}
              />
              {#if errors.find((e) => e.path[0] === 'width')}
                <p class="text-error-500">{errors.find((e) => e.path[0] === 'width')?.message}</p>
              {/if}
            </label>
          </div>
          <div class="mt-4 flex w-1/2 gap-4">
            <label class="label">
              <span>Quality 1-100</span>
              <input
                type="number"
                placeholder="Quality"
                bind:value={formData.quality}
                class={`input w-full ${
                  errors.find((e) => e.path[0] === 'quality') ? 'input-error' : ''
                }`}
              />
              {#if errors.find((e) => e.path[0] === 'quality')}
                <p class="text-error-500">{errors.find((e) => e.path[0] === 'quality')?.message}</p>
              {/if}
            </label>
          </div>
        </article>
        {#if loading}
          <p>
            {statusMessage}
          </p>
        {/if}
        <footer class="flex justify-end gap-2 pt-4">
          <Dialog.CloseTrigger class="btn preset-tonal">Close</Dialog.CloseTrigger>
          <button class="btn preset-filled-primary" onclick={handleSubmit} disabled={loading}>
            {#if loading}
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            {:else}
              Create
            {/if}
          </button>
        </footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog>
