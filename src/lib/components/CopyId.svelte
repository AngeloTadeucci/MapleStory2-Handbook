<script lang="ts">
  import { url } from '$lib/helpers/addBasePath';

  type Props = {
    id: number;
    extraClass?: string;
  };

  let { id, extraClass }: Props = $props();

  import { getToastStore } from '@skeletonlabs/skeleton';
  import type { ToastSettings } from '@skeletonlabs/skeleton';

  const t: ToastSettings = {
    message: 'Copied to clipboard',
    timeout: 1500,
    classes: 'variant-filled-success'
  };

  const toastStore = getToastStore();
</script>

<button
  onclick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id.toString());
    toastStore.trigger(t);
  }}
  title="Copy ID"
  class="flex items-center justify-center gap-2 rounded-lg border border-gray2 p-1 px-2 {extraClass}"
>
  {id}
  <img src={url('/icons/copy-content.svg')} width={20} height={20} alt="Copy" />
</button>
