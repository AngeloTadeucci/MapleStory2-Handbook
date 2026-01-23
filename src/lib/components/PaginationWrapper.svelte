<script lang="ts">
  import { Pagination } from '@skeletonlabs/skeleton-svelte';
  import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-svelte';

  interface Props {
    count: number;
    pageSize: number;
    page: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    class?: string;
  }

  let {
    count,
    pageSize,
    page,
    pageSizeOptions = [10, 25, 50, 100],
    onPageChange,
    onPageSizeChange,
    class: className = ''
  }: Props = $props();

  let innerWidth = $state(768);
  let isMobile = $derived(innerWidth < 640);
  let totalPages = $derived(Math.ceil(count / pageSize));
</script>

<svelte:window bind:innerWidth />

<div class="flex flex-wrap items-center justify-center gap-2 {className}">
  {#if onPageSizeChange}
    <select
      class="select w-20 bg-surface-700 text-surface-50"
      value={pageSize}
      onchange={(e) => onPageSizeChange?.(Number(e.currentTarget.value))}
    >
      {#each pageSizeOptions as size}
        <option value={size}>{size}</option>
      {/each}
    </select>
  {/if}
  <Pagination
    {count}
    {pageSize}
    {page}
    onPageChange={(event) => onPageChange(event.page)}
    class="flex items-center gap-1 rounded-lg bg-surface-700 p-2"
  >
    <Pagination.FirstTrigger class="btn btn-sm preset-tonal">
      <ChevronsLeft size={16} />
    </Pagination.FirstTrigger>
    <Pagination.PrevTrigger class="btn btn-sm preset-tonal">
      <ChevronLeft size={16} />
    </Pagination.PrevTrigger>
    {#if isMobile}
      <span class="px-2 text-sm text-surface-50">{page} / {totalPages}</span>
    {:else}
      <Pagination.Context>
        {#snippet children(pagination)}
          {#each pagination().pages as p, index (p)}
            {#if p.type === 'page'}
              <Pagination.Item {...p} class="btn btn-sm {p.value === page ? 'preset-filled-primary-500' : 'preset-tonal'}">{p.value}</Pagination.Item>
            {:else}
              <Pagination.Ellipsis {index} class="btn btn-sm preset-tonal">…</Pagination.Ellipsis>
            {/if}
          {/each}
        {/snippet}
      </Pagination.Context>
    {/if}
    <Pagination.NextTrigger class="btn btn-sm preset-tonal">
      <ChevronRight size={16} />
    </Pagination.NextTrigger>
    <Pagination.LastTrigger class="btn btn-sm preset-tonal">
      <ChevronsRight size={16} />
    </Pagination.LastTrigger>
  </Pagination>
</div>
