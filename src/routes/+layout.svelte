<script lang="ts">
	// Your custom Skeleton theme:
	import '../theme.postcss';
	// If you have source.organizeImports set to true in VSCode, then it will auto change this ordering
	import '@skeletonlabs/skeleton/styles/all.css';
	import { AppShell, Toast } from '@skeletonlabs/skeleton';
	// Most of your app wide CSS should be put in this file
	import '../app.postcss';
	import Navigation from '../lib/components/Navigation.svelte';
	import PageFooter from '../lib/components/PageFooter.svelte';
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });

	import { page } from '$app/stores';

	import { Modal } from '@skeletonlabs/skeleton';
</script>

<Modal />
<Toast />
{#if $page.route.id?.includes('[slug]/model')}
	<slot />
{:else}
	<AppShell>
		<svelte:fragment slot="header">
			<Navigation />
		</svelte:fragment>
		<!-- Router Slot -->
		<slot />
		<!-- ---- / ---- -->
		<svelte:fragment slot="pageFooter">
			<PageFooter />
		</svelte:fragment>
	</AppShell>
{/if}
