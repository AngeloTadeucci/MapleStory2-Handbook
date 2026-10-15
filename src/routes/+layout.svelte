<script lang="ts">
  import '../app.css';

  import Navigation from '../lib/components/Navigation.svelte';
  import PageFooter from '../lib/components/PageFooter.svelte';
  import MusicPlayer from '../lib/components/MusicPlayer.svelte';
  import { GoogleAnalytics } from '@beyonk/svelte-google-analytics';

  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  // Derive isModelPage reactively to avoid SSR store subscription issues
  let isModelPage = $derived($page.route.id?.includes('[slug]/model') ?? false);

  // Discord shows every og:image as a gallery, so pages with their own must not get the default too.
  const routesWithOwnOgImage = new Set([
    '/items/[slug]',
    '/npcs/[slug]',
    '/maps/[slug]',
    '/trophies/[slug]'
  ]);
  let hasOwnOgImage = $derived(routesWithOwnOgImage.has($page.route.id ?? ''));
</script>

<svelte:head>
  {#if !hasOwnOgImage}
    <meta property="og:image" content="https://handbook.tadeucci.dev/logo.png" />
  {/if}
</svelte:head>

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
    <MusicPlayer />
  </div>
{/if}
