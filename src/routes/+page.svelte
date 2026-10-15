<script lang="ts">
  import MostViewedSection from '../lib/components/MostViewedSection.svelte';
  import PatchNotesSection from '../lib/components/PatchNotesSection.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>MapleStory 2 Handbook</title>

  <!-- Open graph -->
  <meta property="og:title" content="MapleStory 2 Handbook" />
  <meta property="og:description" content="The ultimate MapleStory 2 database and handbook." />
  <meta property="og:url" content="https://handbook.tadeucci.dev/" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<div class="px-4">
  <div
    class="flex h-full flex-col items-start justify-center gap-2 rounded-xl bg-surface-500 py-8 md:flex-row md:gap-3 lg:m-auto lg:flex-row lg:gap-10 min-[1500px]:w-3/4"
  >
    <MostViewedSection title="Most Viewed Items" items={data.props.mostViewedItems} type="items" />
    <MostViewedSection title="Most Viewed NPCs" items={data.props.mostViewedNpcs} type="npcs" />
  </div>
  <div
    class="flex h-full flex-col items-start justify-center gap-2 rounded-xl bg-surface-500 py-8 md:flex-row md:gap-3 lg:m-auto lg:flex-row lg:gap-10 min-[1500px]:w-3/4"
  >
    <MostViewedSection title="Most Viewed Maps" items={data.props.mostViewedMaps} type="maps" />
    <MostViewedSection
      title="Most Viewed Trophies"
      items={data.props.mostViewedTrophies}
      type="trophies"
    />
  </div>

  <div
    class="mt-4 flex h-full flex-col items-center justify-center rounded-xl bg-surface-500 py-8 lg:m-auto min-[1500px]:w-3/4"
  >
    <PatchNotesSection />
  </div>
</div>
