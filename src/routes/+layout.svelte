<script lang="ts">
  import '../app.postcss';

  import Navigation from '../lib/components/Navigation.svelte';
  import PageFooter from '../lib/components/PageFooter.svelte';
  // @ts-ignore
  import { GoogleAnalytics } from '@beyonk/svelte-google-analytics';
  import { AppShell, initializeStores, Toast } from '@skeletonlabs/skeleton';

  import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';

  import { storePopup } from '@skeletonlabs/skeleton';
  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

  initializeStores();

  import { page } from '$app/stores';

  import { Modal } from '@skeletonlabs/skeleton';
  import type { Snippet } from 'svelte';
  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<GoogleAnalytics properties={['G-KNN265BGLK']} />
<Modal />
<Toast />
{#if $page.route.id?.includes('[slug]/model')}
  {@render children()}
{:else}
  <AppShell>
    {#snippet header()}
        <Navigation />
      {/snippet}
    <!-- Router Slot -->
    {@render children()}
    <!-- ---- / ---- -->
    {#snippet pageFooter()}
        <PageFooter />
      {/snippet}
  </AppShell>
{/if}
