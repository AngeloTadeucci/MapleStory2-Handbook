<script lang="ts">
  import '../theme.postcss';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { AppShell, Toast } from '@skeletonlabs/skeleton';
  import '../app.postcss';

  import Navigation from '../lib/components/Navigation.svelte';
  import PageFooter from '../lib/components/PageFooter.svelte';
  // @ts-ignore
  import { GoogleAnalytics } from '@beyonk/svelte-google-analytics';
  import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
  import { storePopup } from '@skeletonlabs/skeleton';
  storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });

  import { page } from '$app/stores';

  import { Modal } from '@skeletonlabs/skeleton';
</script>

<GoogleAnalytics properties={['G-KNN265BGLK']} />
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
