<script lang="ts">
  import {
    getModalStore,
    getToastStore,
    type ToastSettings,
    ProgressRadial
  } from '@skeletonlabs/skeleton';
  import type { Npc } from '$lib/types/Npc';
  import type { ZodIssue } from 'zod';
  import { gifSchema } from '$lib/schemas/gif';
  import { PUBLIC_GIFS_URL } from '$env/static/public';

  type CreateGifProps = {
    npc: Npc;
    modelViewer: any;
    selectedAnimation: string;
  };
  export let { npc, modelViewer, selectedAnimation } = {} as CreateGifProps;
  export let parent: any;

  const toastStore = getToastStore();
  const modalStore = getModalStore();

  let resize = false;
  let loading = false;
  let statusMessage = '';

  const cBase = 'card p-4 shadow-xl space-y-4';
  const cHeader = 'text-2xl font-bold';

  const formData = {
    framerate: 15,
    height: modelViewer.offsetHeight,
    width: modelViewer.offsetWidth,
    quality: 70
  };

  let errors: ZodIssue[] = [];

  const handleSubmit = async () => {
    if (!modelViewer) {
      modalStore.close();
    }

    errors = [];
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
    } else {
      const { message } = await response.json();

      modalStore.close();
      const t: ToastSettings = {
        message: message,
        timeout: 2500,
        classes: 'variant-filled-error'
      };
      toastStore.trigger(t);
    }
  };
</script>

{#if $modalStore[0]}
  <div class="modal-example-form {cBase} w-modal">
    <header class={cHeader}>Create GIF</header>
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
    <footer class="modal-footer {parent.regionFooter}">
      <button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>Close</button>
      <button class="btn {parent.buttonPositive}" on:click|preventDefault={handleSubmit}>
        {#if loading}
          <ProgressRadial width="w-6" track="stroke-black" />
        {:else}
          Create
        {/if}
      </button>
    </footer>
  </div>
{/if}
