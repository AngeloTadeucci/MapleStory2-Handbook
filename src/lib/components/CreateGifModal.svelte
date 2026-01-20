<script lang="ts">
  import type { Npc } from '$lib/types/Npc';
  import type { ZodIssue } from 'zod';
  import { gifSchema } from '$lib/schemas/gif';
  import { PUBLIC_GIFS_URL } from '$env/static/public';
  import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';

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

  $effect(() => {
    if (modelViewer) {
      formData.height = modelViewer.offsetHeight || 400;
      formData.width = modelViewer.offsetWidth || 400;
    }
  });

  let errors: ZodIssue[] = $state([]);

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
    const screenshots = [];
    const duration = modelViewer.duration;

    const iIncrease = 1 / formData.framerate;
    for (let i = 0.0; i < duration; i += iIncrease) {
      modelViewer.currentTime = i;
      await new Promise((resolve) => setTimeout(resolve, 50));
      const blob = modelViewer.toDataURL();
      screenshots.push(blob);
    }

    if (screenshots.length === 0) {
      return;
    }
    modelViewer.play();

    statusMessage = 'Processing...';

    const response = await fetch(`/api/gif`, {
      method: 'POST',
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
      // open gif in new tab
      window.open(PUBLIC_GIFS_URL + url, '_blank');
      onClose();
    } else {
      const { message } = await response.json();
      errorMessage = message;
    }
  };

  function handleClose() {
    onClose();
  }
</script>

<Dialog {open} onOpenChange={(details) => { if (!details.open) handleClose(); }}>
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
            The browser will take a screenshot of the canvas for every frame and then send them for
            processing.
          </li>
          <li>Don't worry about the background, it will be transparent.</li>
          <li>
            The processing may take a while, depending on the length of the animation and the quality
            you choose.
          </li>
          <li>All gifs will be deleted after 24 hours. Make sure you download it!</li>
        </ul>
        <label class="label">
          <span>Framerate</span>
          <select
            class={`select ${errors.find((e) => e.path[0] === 'quality') ? 'select-error' : ''}`}
            bind:value={formData.framerate}
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
          {#if errors.find((e) => e.path[0] === 'framerate')}
            <p class="text-error-500">{errors.find((e) => e.path[0] === 'framerate')?.message}</p>
          {/if}
        </label>
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
