<script lang="ts">
  import { getRecentPatchNotes, getChangeTypeColor, getChangeTypeLabel } from '$lib/patchNotes';

  const recentNotes = getRecentPatchNotes(3);
</script>

<div class="w-full px-5 lg:px-0">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-bold">Recent Updates</h2>
    <a
      href={'/patchnotes'}
      class="text-sm text-primary-400 hover:text-primary-300 underline"
    >
      View all →
    </a>
  </div>

  <div class="space-y-4">
    {#each recentNotes as note}
      <div class="rounded-lg bg-surface-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold">{note.title}</span>
          <div class="flex items-center gap-3 text-sm opacity-70">
            <span>{new Date(note.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}</span>
          </div>
        </div>
        <ul class="space-y-1 text-sm">
          {#each note.changes.slice(0, 3) as change}
            <li class="flex items-start gap-2">
              <span class={`font-medium ${getChangeTypeColor(change.type)}`}>
                [{getChangeTypeLabel(change.type)}]
              </span>
              <span class="opacity-90">{change.description}</span>
            </li>
          {/each}
          {#if note.changes.length > 3}
            <li class="text-primary-400 opacity-70">
              +{note.changes.length - 3} more changes...
            </li>
          {/if}
        </ul>
      </div>
    {/each}
  </div>

  {#if recentNotes.length === 0}
    <p class="text-center opacity-70 py-4">No patch notes yet.</p>
  {/if}
</div>
