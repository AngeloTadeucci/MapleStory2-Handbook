<script lang="ts">
	import { url } from '$lib/helpers/addBasePath';

	type Props = {
		id: number;
		extraClass?: string;
	};

	export let { id, extraClass } = {} as Props;

	import { toastStore } from '@skeletonlabs/skeleton';
	import type { ToastSettings } from '@skeletonlabs/skeleton';

	const t: ToastSettings = {
		message: 'Copied to clipboard',
		timeout: 1500,
		classes: 'variant-filled-success'
	};
</script>

<button
	on:click={(e) => {
		navigator.clipboard.writeText(id.toString());
		e.stopPropagation();
		toastStore.trigger(t);
	}}
	title="Copy ID"
	class="flex items-center justify-center gap-2 rounded-lg border border-surface-100 p-1 px-2 {extraClass}"
>
	{id}
	<img src={url('/icons/copy-content.svg')} width={20} height={20} alt="Copy" />
</button>
