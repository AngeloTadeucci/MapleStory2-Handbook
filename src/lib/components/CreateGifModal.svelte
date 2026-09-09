<script lang="ts">
  import { captureGifFrames, type GifCaptureSource } from '$lib/gifCapture';
  import type { ZodIssue } from 'zod';
  import { gifSchema } from '$lib/schemas/gif';
  import { PUBLIC_GIFS_URL } from '$env/static/public';
  import { Dialog, Portal, Combobox, useListCollection } from '@skeletonlabs/skeleton-svelte';

  type CreateGifProps = {
    model: string;
    download?: boolean;
    source: GifCaptureSource | undefined;
    selectedAnimation: string;
    open: boolean;
    onClose: () => void;
  };
  let {
    model,
    source,
    selectedAnimation,
    open,
    onClose,
    download = false
  }: CreateGifProps = $props();

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
    if (source) {
      formData.height = source.height || 400;
      formData.width = source.width || 400;
    }
  });

  let errors: ZodIssue[] = $state([]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!source) {
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

    try {
      const screenshots = await captureGifFrames(source, formData.framerate, (done, total) => {
        statusMessage = `Capturing frame ${done} of ${total}...`;
      });
      statusMessage = 'Creating GIF...';
      const payload = JSON.stringify({
        model,
        download,
        animation: selectedAnimation,
        screenshots,
        ...formData
      });
      const response = await fetch(`/api/gif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (response.ok) {
        if (download) {
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement('a');
          link.href = url;
          link.download = 'maplestory2-outfit.gif';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } else {
          const { url } = await response.json();
          window.open(PUBLIC_GIFS_URL + url, '_blank');
        }
        onClose();
      } else if (response.status === 413) {
        errorMessage =
          'The animation is too long or high quality. Try reducing framerate, quality, or resizing to smaller dimensions.';
      } else {
        const data = await response.json().catch(() => ({ message: 'Unknown error' }));
        errorMessage = data.message || 'Failed to create GIF';
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  };

  function handleClose() {
    if (!loading) onClose();
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
      <Dialog.Content
        class="card bg-surface-800 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 space-y-4 shadow-xl"
      >
        <Dialog.Title class="text-2xl font-bold">Create GIF</Dialog.Title>
        {#if errorMessage}
          <div class="p-3 bg-error-500/20 border border-error-500 rounded text-error-300">
            {errorMessage}
          </div>
        {/if}
        <fieldset disabled={loading}>
          <p class="mb-4">
            Save the current animation and camera view as a transparent GIF. Longer animations and
            higher frame rates take more time.
          </p>
          {#if !download}<p class="mb-4">
              Download your GIF within 24 hours before it expires.
            </p>{/if}
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
        </fieldset>
        {#if loading}
          <p>
            {statusMessage}
          </p>
        {/if}
        <footer class="flex justify-end gap-2 pt-4">
          <Dialog.CloseTrigger disabled={loading} class="btn preset-tonal"
            >Close</Dialog.CloseTrigger
          >
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
