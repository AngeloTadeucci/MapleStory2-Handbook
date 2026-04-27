<script lang="ts">
  import { tick } from 'svelte';

  type MenuItem = {
    name: string;
    path: string;
  };

  const menus: MenuItem[] = [
    { name: 'Items', path: '/items' },
    { name: 'NPCs', path: '/npcs' },
    { name: 'Maps', path: '/maps' },
    { name: 'Quests', path: '/quests' },
    { name: 'Housing', path: '/housing' },
    { name: 'Trophies', path: '/trophies' },
    { name: 'Dyes', path: '/dyes' },
    { name: 'Story Books', path: '/storybooks' },
    { name: 'Soundtrack', path: '/music' }
    // { name: 'Dungeons', path: '/dungeons' },
    // { name: 'Skills', path: '/skills' },
  ];

  let open = $state(false);
  let moreOpen = $state(false);
  let visibleCount = $state(menus.length);
  let navContent: HTMLDivElement | null = $state(null);
  let measureContainer: HTMLDivElement | null = $state(null);
  let moreMeasure: HTMLDivElement | null = $state(null);

  const visibleMenus = $derived(menus.slice(0, visibleCount));
  const overflowMenus = $derived(menus.slice(visibleCount));

  async function recalculateVisibleCount() {
    await tick();

    if (!navContent || !measureContainer || !moreMeasure) {
      return;
    }

    const availableWidth = navContent.clientWidth;
    const itemWidths = Array.from(measureContainer.children).map(
      (child) => (child as HTMLElement).offsetWidth
    );
    const moreWidth = moreMeasure.offsetWidth;

    let usedWidth = 0;
    let nextVisibleCount = itemWidths.length;

    for (let index = 0; index < itemWidths.length; index++) {
      const remainingAfterThis = itemWidths.length - index - 1;
      const reserveMore = remainingAfterThis > 0 ? moreWidth : 0;

      if (usedWidth + itemWidths[index] + reserveMore > availableWidth) {
        nextVisibleCount = index;
        break;
      }

      usedWidth += itemWidths[index];
    }

    visibleCount = Math.max(0, nextVisibleCount);

    if (visibleCount === menus.length) {
      moreOpen = false;
    }
  }

  $effect(() => {
    if (!navContent) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      recalculateVisibleCount();
    });
    resizeObserver.observe(navContent);
    recalculateVisibleCount();

    return () => resizeObserver.disconnect();
  });
</script>

<nav class="flex h-32 items-center bg-surface-700 px-12 py-6 drop-shadow-lg">
  <a href="/">
    <img
      src="/logo.png"
      width={112}
      height={68}
      alt="Logo MapleStory2 Handbook"
      title="MapleStory2 Handbook"
      class="priority"
    />
  </a>

  <div class="hidden min-w-0 flex-1 md:flex" bind:this={navContent}>
    <div class="ml-8 mr-4 h-20 w-px border-l border-gray2"></div>

    {#each visibleMenus as menu}
      <div class="flex shrink-0 items-center">
        <a href={menu.path} class="unstyled px-2 py-2 font-sans font-bold">{menu.name}</a>
        <div class="mx-3 h-14 w-px border-l border-gray2"></div>
      </div>
    {/each}

    {#if overflowMenus.length > 0}
    <div class="relative flex shrink-0 items-center">
      <button
        type="button"
        class="unstyled px-2 py-2 font-sans font-bold"
        onmouseenter={() => (moreOpen = true)}
        onclick={() => (moreOpen = !moreOpen)}
      >
        More
      </button>
      {#if moreOpen}
        <div
          role="menu"
          tabindex="-1"
          class="absolute left-0 top-full z-30 min-w-40 rounded border border-gray2 bg-surface-700 py-2 shadow-lg"
          onmouseenter={() => (moreOpen = true)}
          onmouseleave={() => (moreOpen = false)}
        >
          {#each overflowMenus as menu}
            <a href={menu.path} role="menuitem" class="unstyled block px-4 py-2 font-sans font-bold hover:bg-surface-600">
              {menu.name}
            </a>
          {/each}
        </div>
      {/if}
      <div class="mx-3 h-14 w-px border-l border-gray2"></div>
    </div>
    {/if}
  </div>

  <div class="pointer-events-none invisible fixed -left-[9999px] top-0 flex" aria-hidden="true" bind:this={measureContainer}>
    {#each menus as menu}
      <div class="flex shrink-0 items-center">
        <a href={menu.path} class="unstyled px-2 py-2 font-sans font-bold">{menu.name}</a>
        <div class="mx-3 h-14 w-px border-l border-gray2"></div>
      </div>
    {/each}
  </div>
  <div class="pointer-events-none invisible fixed -left-[9999px] top-0 flex" aria-hidden="true" bind:this={moreMeasure}>
    <div class="relative flex shrink-0 items-center">
      <button type="button" class="unstyled px-2 py-2 font-sans font-bold">More</button>
      <div class="mx-3 h-14 w-px border-l border-gray2"></div>
    </div>
  </div>

  <div class="hidden items-center md:flex">
    <div class="ml-6 mr-8 h-20 w-px border-l border-gray2"></div>

    <a href="https://ko-fi.com/angelotadeucci" target="_blank" rel="noreferrer" title="Ko-fi">
      <img src="/kofi.png" width={109} height={45} alt="Ko-fi" class="cursor-pointer" />
    </a>
  </div>

  <div class="ml-auto block md:hidden">
    <button
      class="flex items-center rounded border border-gray2 px-3 py-2"
      onclick={() => (open = !open)}
    >
      <svg class="h-3 w-3 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <title>Menu</title>
        <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
      </svg>
    </button>
  </div>
</nav>

{#if open}
  <div class="fixed inset-0 z-20 bg-surface-700 px-12 pb-6">
    <div class="flex h-32 items-center">
      <a href="/" onclick={() => (open = false)}>
        <img
          src="/logo.png"
          width={112}
          height={68}
          alt="Logo MapleStory2 Handbook"
          title="MapleStory2 Handbook"
          class="priority"
        />
      </a>
      <button
        class="ml-auto flex items-center rounded border border-gray2 px-3 py-2"
        onclick={() => (open = !open)}
      >
        <svg class="h-3 w-3 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <title>Close</title>
          <path
            fill-rule="evenodd"
            d="M10 10L3.293 3.293a1 1 0 111.414-1.414L11 8.586l6.707-6.707a1 1 0 111.414 1.414L12.414 10l6.707 6.707a1 1 0 01-1.414 1.414L11 11.414l-6.707 6.707a1 1 0 01-1.414-1.414L9.586 10z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    <div class="mt-5 flex h-4/5 flex-col items-center">
      {#each menus as menu, index}
        <a
          href={menu.path}
          class="unstyled px-2 font-sans font-bold"
          onclick={() => (open = false)}>{menu.name}</a
        >
        {#if index !== menus.length - 1}
          <div class="h-px w-full border-t border-gray2 my-4"></div>
        {/if}
      {/each}
      <a
        href="https://ko-fi.com/angelotadeucci"
        target="_blank"
        rel="noreferrer"
        title="Ko-fi"
        class="mt-auto"
      >
        <img src="/kofi.png" width={109} height={45} alt="Ko-fi" class="cursor-pointer" />
      </a>
    </div>
  </div>
{/if}

<style>
  nav {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
    grid-row: 1;
  }
</style>
