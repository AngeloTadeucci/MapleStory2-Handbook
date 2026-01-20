<script lang="ts">
  import '../app.css';

  import Navigation from '../lib/components/Navigation.svelte';
  import PageFooter from '../lib/components/PageFooter.svelte';
  // @ts-ignore
  import { GoogleAnalytics } from '@beyonk/svelte-google-analytics';

  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  // Derive isModelPage reactively to avoid SSR store subscription issues
  let isModelPage = $derived($page.route.id?.includes('[slug]/model') ?? false);
</script>

<GoogleAnalytics properties={['G-KNN265BGLK']} />

{#if isModelPage}
  {@render children()}
{:else}
  <!-- Custom layout replacing AppShell -->
  <div class="h-screen grid grid-rows-[auto_1fr_auto]">
    <!-- Header -->
    <header>
      <Navigation />
    </header>
    <div class="overflow-auto">
      <!-- Main content -->

      {@render children()}

      <!-- Footer -->
      <footer>
        <PageFooter />
      </footer>
    </div>
  </div>
{/if}
