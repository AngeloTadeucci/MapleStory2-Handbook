<script lang="ts">
  import { patchNotes, getChangeTypeColor, getChangeTypeLabel } from '$lib/patchNotes';
</script>

<svelte:head>
  <title>Patch Notes - MapleStory 2 Handbook</title>
  <meta name="description" content="Patch notes and changelog for MapleStory 2 Handbook" />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12">
  <div class="rounded-xl bg-surface-500 p-8">
    <h1 class="mb-2 text-3xl font-bold">Patch Notes</h1>
    <p class="mb-8 opacity-70">Changelog and updates for MapleStory 2 Handbook</p>

    <div class="space-y-8">
      {#each patchNotes as note}
        <article class="border-l-4 border-primary-500 pl-6">
          <header class="mb-4">
            <div class="flex flex-wrap items-center gap-3 mb-1">
              <h2 class="text-xl font-semibold">{note.title}</h2>
              <span class="bg-surface-700 px-2 py-0.5 rounded text-sm">v{note.version}</span>
            </div>
            <time class="text-sm opacity-70">
              {new Date(note.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </header>

          <ul class="space-y-2">
            {#each note.changes as change}
              <li class="flex items-start gap-2">
                <span class={`font-medium text-sm whitespace-nowrap ${getChangeTypeColor(change.type)}`}>
                  [{getChangeTypeLabel(change.type)}]
                </span>
                <span class="opacity-90">{change.description}</span>
              </li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>

    {#if patchNotes.length === 0}
      <p class="text-center opacity-70 py-8">No patch notes available yet.</p>
    {/if}
  </div>
</div>
