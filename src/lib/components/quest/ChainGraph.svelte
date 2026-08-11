<script lang="ts">
  import {
    DEFAULT_LAYOUT_OPTIONS,
    layoutChainGraph,
    type LaidOutNode
  } from '$lib/helpers/questChainLayout';
  import type { ChainEdge, ChainNode } from '$lib/types/QuestChain';
  import { getQuestTypeName } from '$lib/types/Quest';
  import { Minus, Plus, RotateCcw } from 'lucide-svelte';

  interface Props {
    nodes: ChainNode[];
    edges: ChainEdge[];
    selectedId: number | null;
    /** The chapter this view is about, drawn brighter than the ones around it. */
    currentChapterId: number | null;
    /**
     * Background tint per chapter id, worked out on the server across every
     * chapter at once so a chapter keeps its colour in every view. Quests with
     * no chapter are keyed under -1.
     */
    chapterTones: Record<number, number>;
    /** Builds the URL that selects a quest in the detail panel. */
    selectHref: (questId: number) => string;
  }

  let { nodes, edges, selectedId, currentChapterId, chapterTones, selectHref }: Props = $props();

  const ZOOM_STEPS = [0.6, 0.75, 0.9, 1, 1.15, 1.3];
  let zoomStep = $state(3);
  const zoom = $derived(ZOOM_STEPS[zoomStep]);

  // The turn from one row into the next bulges out past the quests on both
  // sides, so the canvas carries more room left and right than above and below.
  // The top also has to clear the chapter label above the first row.
  const PADDING_Y = 40;
  const PADDING_X = 100;
  /** Ceiling on how far a turn bulges, kept inside PADDING_X. */
  const MAX_TURN_BEND = 120;

  // Width of the scroll area, so the chain wraps to whatever room it has. It is
  // 0 until the element is measured on the client, and the fallback keeps the
  // server render close to a typical desktop width. Dividing by the zoom means
  // zooming out fits more quests per row instead of leaving the row short. The
  // floor stops a narrow column from wrapping after two quests, which turns a
  // long chain into a very tall ribbon.
  let viewportWidth = $state(0);
  const bandWidth = $derived(Math.max(1100, (viewportWidth || 1600) / zoom - PADDING_X * 2));

  const layout = $derived(layoutChainGraph(nodes, edges, { bandWidth }));

  const neighbours = $derived.by(() => {
    const set = new Set<number>();
    if (selectedId === null) return set;
    set.add(selectedId);
    for (const edge of edges) {
      if (edge.from === selectedId) set.add(edge.to);
      if (edge.to === selectedId) set.add(edge.from);
    }
    return set;
  });

  const width = $derived(Math.max(1, layout.width + PADDING_X * 2));
  const height = $derived(Math.max(1, layout.height + PADDING_Y * 2));

  const REGION_PAD_X = 12;
  // Half the gap between rows, so the areas of a chapter that runs over several
  // rows meet edge to edge and read as one continuous field rather than a stack
  // of separate boxes.
  const REGION_PAD_Y = DEFAULT_LAYOUT_OPTIONS.bandGapY / 2;
  interface ChapterRegion {
    key: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    /** Index into the background palette, fixed per chapter. */
    tone: number;
    /** The chapter the view is about, drawn a step brighter. */
    current: boolean;
    /** Only the first row of a chapter carries its name. */
    labelled: boolean;
  }

  // A shaded area behind each run of quests that share a chapter, so the point
  // where one chapter hands over to the next is visible. Areas are cut per row:
  // a chapter that spans one of the turns gets an area on each row it occupies
  // rather than one box swallowing everything between them.
  const chapterRegions = $derived.by(() => {
    const distinct = new Set(layout.nodes.map((laid) => laid.item.chapterId));
    // With a single chapter on screen the shading would only repeat what the
    // page heading already says.
    if (distinct.size < 2) return [] as ChapterRegion[];

    interface Box {
      name: string;
      chapterId: number;
      band: number;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }
    // One area per unbroken run of a chapter along a single row. Taking the
    // bounding box of everything a chapter holds in a band instead would swallow
    // the other chapters sitting between its quests, since a band that wraps into
    // columns stacks several rows and chapters interleave along them.
    const rows = new Map<string, Array<(typeof layout.nodes)[number]>>();
    for (const laid of layout.nodes) {
      const key = `${laid.band}:${laid.y}`;
      const row = rows.get(key);
      if (row) row.push(laid);
      else rows.set(key, [laid]);
    }

    const boxes = new Map<string, Box>();
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      let box: Box | null = null;
      for (const laid of row) {
        const chapterId = laid.item.chapterId ?? -1;
        // A run also breaks over a hole wider than a column gap. Stretching one
        // area across the hole would reach over whatever a neighbouring chain
        // has been packed into it.
        const adjacent = box !== null && laid.x - box.maxX <= DEFAULT_LAYOUT_OPTIONS.gapX;
        if (!box || box.chapterId !== chapterId || !adjacent) {
          box = {
            name: laid.item.chapterName ?? 'No chapter',
            chapterId,
            band: laid.band,
            minX: laid.x,
            minY: laid.y,
            maxX: laid.x + laid.width,
            maxY: laid.y + laid.height
          };
          boxes.set(`${chapterId}:${laid.band}:${laid.y}:${laid.x}`, box);
          continue;
        }
        if (laid.x + laid.width > box.maxX) box.maxX = laid.x + laid.width;
      }
    }

    // The name goes on the first area a chapter reaches, reading top to bottom
    // and then left to right. Repeating it over every area of a long chapter says
    // nothing the tint has not already said.
    const labelKey = new Map<number, string>();
    for (const [key, box] of boxes) {
      const current = labelKey.get(box.chapterId);
      if (current === undefined) {
        labelKey.set(box.chapterId, key);
        continue;
      }
      const held = boxes.get(current)!;
      if (box.minY < held.minY || (box.minY === held.minY && box.minX < held.minX)) {
        labelKey.set(box.chapterId, key);
      }
    }

    // Meet whatever sits above and below halfway, so areas tile instead of
    // overlapping. Rows are not evenly spaced: two rows of one band sit closer
    // together than two bands do, and separate chains are packed wherever they
    // fit, so a fixed pad wide enough for the largest gap would make the areas
    // around the smallest one overlap and muddy each other's colour.
    function pads(box: Box): { above: number; below: number } {
      let above = REGION_PAD_Y;
      let below = REGION_PAD_Y;
      for (const other of boxes.values()) {
        if (other === box) continue;
        const sharesX =
          other.minX - REGION_PAD_X < box.maxX + REGION_PAD_X &&
          box.minX - REGION_PAD_X < other.maxX + REGION_PAD_X;
        if (!sharesX) continue;
        if (other.maxY <= box.minY) above = Math.min(above, (box.minY - other.maxY) / 2);
        if (other.minY >= box.maxY) below = Math.min(below, (other.minY - box.maxY) / 2);
      }
      return { above: Math.max(0, above), below: Math.max(0, below) };
    }

    const regions: ChapterRegion[] = [];
    for (const [key, box] of boxes) {
      const { above, below } = pads(box);
      regions.push({
        key,
        name: box.name,
        x: box.minX - REGION_PAD_X,
        y: box.minY - above,
        width: box.maxX - box.minX + REGION_PAD_X * 2,
        height: box.maxY - box.minY + above + below,
        tone: chapterTones[box.chapterId] ?? 0,
        current: box.chapterId === currentChapterId,
        labelled: labelKey.get(box.chapterId) === key
      });
    }
    return regions;
  });

  function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function edgePath(source: LaidOutNode<ChainNode>, target: LaidOutNode<ChainNode>): string {
    // An edge leaves on the side the band points at and arrives on the far side
    // of its target. When the two sit in bands that read opposite ways, both
    // control points push the same way and the curve becomes the U turn that
    // carries the chain into the next row.
    const x1 = source.direction === 1 ? source.x + source.width : source.x;
    const y1 = source.y + source.height / 2;
    const x2 = target.direction === 1 ? target.x : target.x + target.width;
    const y2 = target.y + target.height / 2;
    const span = Math.abs(x2 - x1);
    const turns = source.direction !== target.direction;
    const bend = turns
      ? Math.min(MAX_TURN_BEND, Math.max(72, span * 0.5 + Math.abs(y2 - y1) * 0.3))
      : Math.max(26, span * 0.45);
    return `M${x1},${y1} C${x1 + source.direction * bend},${y1} ${x2 - target.direction * bend},${y2} ${x2},${y2}`;
  }

  function roleLabel(role: ChainNode['role']): string {
    if (role === 'up') return 'Prerequisite from outside';
    if (role === 'down') return 'Unlocked outside this view';
    return 'In this view';
  }
</script>

<div class="rounded-xl bg-surface-800">
  <div
    class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-600 px-4 py-3"
  >
    <div class="flex flex-col gap-1">
      <ul class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-200">
        <li class="flex items-center gap-2">
          <span class="legend-swatch legend-in"></span> In this chain
        </li>
        <li class="flex items-center gap-2">
          <span class="legend-swatch legend-up"></span> Prerequisite from elsewhere
        </li>
        <li class="flex items-center gap-2">
          <span class="legend-swatch legend-down"></span> Unlocks something elsewhere
        </li>
        <li class="flex items-center gap-2">
          <svg width="34" height="10" aria-hidden="true"
            ><line
              x1="1"
              y1="5"
              x2="33"
              y2="5"
              stroke="var(--color-surface-300)"
              stroke-width="2"
              stroke-dasharray="5 4"
            /></svg
          >
          Any one of
        </li>
      </ul>
      <p class="text-xs text-surface-300">
        Click a quest for its details. The arrow opens the full quest page.
        {#if chapterRegions.length > 0}Shaded areas group the quests by chapter.{/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm text-surface-300">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        class="btn-icon btn-icon-sm preset-tonal"
        aria-label="Zoom out"
        disabled={zoomStep === 0}
        onclick={() => (zoomStep = Math.max(0, zoomStep - 1))}
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        class="btn-icon btn-icon-sm preset-tonal"
        aria-label="Zoom in"
        disabled={zoomStep === ZOOM_STEPS.length - 1}
        onclick={() => (zoomStep = Math.min(ZOOM_STEPS.length - 1, zoomStep + 1))}
      >
        <Plus size={16} />
      </button>
      <button
        type="button"
        class="btn-icon btn-icon-sm preset-tonal"
        aria-label="Reset zoom to 100 percent"
        onclick={() => (zoomStep = 3)}
      >
        <RotateCcw size={16} />
      </button>
    </div>
  </div>

  <div class="chain-scroll max-h-[70vh] overflow-auto p-2" bind:clientWidth={viewportWidth}>
    <svg
      width={width * zoom}
      height={height * zoom}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Quest prerequisite graph"
    >
      <defs>
        <marker
          id="chain-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0.5 L8,4 L0,7.5 z" fill="var(--color-surface-400)" />
        </marker>
        <marker
          id="chain-arrow-active"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0.5 L8,4 L0,7.5 z" fill="var(--color-primary-500)" />
        </marker>
      </defs>

      <g transform={`translate(${PADDING_X},${PADDING_Y})`}>
        {#each chapterRegions as region (region.key)}
          <g
            class="chain-region"
            data-tone={region.tone}
            data-region={region.key}
            data-current={region.current ? 'true' : null}
          >
            <rect x={region.x} y={region.y} width={region.width} height={region.height} />
            {#if region.labelled}
              <text x={region.x + 12} y={region.y + 16}>{truncate(region.name, 38)}</text>
            {/if}
          </g>
        {/each}

        {#each layout.edges as laid (`${laid.edge.from}-${laid.edge.to}-${laid.edge.kind}`)}
          {@const active =
            selectedId !== null && (laid.edge.from === selectedId || laid.edge.to === selectedId)}
          <path
            d={edgePath(laid.source, laid.target)}
            fill="none"
            class="chain-edge"
            class:chain-edge-active={active}
            class:chain-edge-selectable={laid.edge.kind === 'selectable'}
            opacity={selectedId !== null && !active ? 0.25 : 0.85}
            marker-end={active ? 'url(#chain-arrow-active)' : 'url(#chain-arrow)'}
          />
        {/each}

        {#each layout.nodes as laid (laid.id)}
          {@const node = laid.item}
          {@const dimmed = selectedId !== null && !neighbours.has(node.id)}
          <g
            transform={`translate(${laid.x},${laid.y})`}
            class="chain-node"
            class:chain-node-in={node.role === 'in'}
            class:chain-node-up={node.role === 'up'}
            class:chain-node-down={node.role === 'down'}
            class:chain-node-selected={node.id === selectedId}
            opacity={dimmed ? 0.4 : 1}
          >
            <a
              href={selectHref(node.id)}
              data-sveltekit-noscroll
              aria-label={`Show details for ${node.name}`}
            >
              <rect
                width={laid.width}
                height={laid.height}
                rx="8"
                class="chain-node-box"
                stroke-width={node.id === selectedId ? 3 : 1.5}
              />
              <text x="14" y="23" class="chain-node-title">{truncate(node.name, 25)}</text>
              <text x="14" y="42" class="chain-node-sub">
                Lv {node.questLevel || '?'} · {getQuestTypeName(node.questType)}
              </text>
              <title>{node.name} (quest {node.id}) · {roleLabel(node.role)}</title>
            </a>
            <a
              href={`/quests/${node.id}`}
              class="chain-node-open"
              aria-label={`Open the quest page for ${node.name}`}
            >
              <circle cx={laid.width - 18} cy="18" r="10" />
              <path
                d={`M${laid.width - 22},22 L${laid.width - 14},14 M${laid.width - 19},14 L${laid.width - 14},14 L${laid.width - 14},19`}
                fill="none"
              />
              <title>Open the quest page for {node.name}</title>
            </a>
          </g>
        {/each}
      </g>
    </svg>
  </div>
</div>

<style>
  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 2px solid;
  }
  .legend-in {
    background: color-mix(in srgb, var(--color-primary-500) 18%, transparent);
    border-color: var(--color-primary-500);
  }
  .legend-up {
    background: color-mix(in srgb, var(--color-warning-500) 18%, transparent);
    border-color: var(--color-warning-500);
  }
  .legend-down {
    background: color-mix(in srgb, var(--color-success-500) 18%, transparent);
    border-color: var(--color-success-500);
  }

  .chain-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--color-surface-400) transparent;
  }

  /* No outline and no rounded corners: the areas of a chapter that spans several
     rows sit edge to edge, and any edge treatment on each would rule a line
     across the middle of it. The colour alone marks where one chapter gives way
     to the next.

     The four hues sit in the violet to red arc plus one cool grey, keeping away
     from the blue, amber and green a quest's border uses for its role. They are
     ordered so the two closest hues, magenta and rose, are never neighbours.

     Which chapter gets which of the four is decided on the server, once for the
     whole game, by buildChapterTones in questChapters.ts. Adding a hue here
     means raising CHAPTER_TONES there to match. */
  .chain-region[data-tone='0'] rect {
    fill: hsl(262 65% 58% / 0.16);
  }
  .chain-region[data-tone='1'] rect {
    fill: hsl(315 60% 58% / 0.16);
  }
  .chain-region[data-tone='2'] rect {
    fill: hsl(215 14% 55% / 0.2);
  }
  .chain-region[data-tone='3'] rect {
    fill: hsl(350 65% 58% / 0.15);
  }

  /* The chapter the page is about keeps its hue and gains roughly half again as
     much strength, so it reads as the subject while the chapters that only touch
     it stay in the background. */
  .chain-region[data-current][data-tone='0'] rect {
    fill: hsl(262 70% 62% / 0.26);
  }
  .chain-region[data-current][data-tone='1'] rect {
    fill: hsl(315 65% 62% / 0.26);
  }
  .chain-region[data-current][data-tone='2'] rect {
    fill: hsl(215 16% 60% / 0.3);
  }
  .chain-region[data-current][data-tone='3'] rect {
    fill: hsl(350 70% 62% / 0.24);
  }
  .chain-region[data-current] text {
    fill: var(--color-surface-50);
  }

  .chain-region text {
    fill: var(--color-surface-200);
    font-size: 12px;
    font-weight: 600;
  }

  .chain-edge {
    stroke: var(--color-surface-400);
    stroke-width: 1.5;
  }
  .chain-edge-selectable {
    stroke-dasharray: 6 5;
  }
  .chain-edge-active {
    stroke: var(--color-primary-500);
    stroke-width: 2.5;
  }

  .chain-node-box {
    fill: var(--color-surface-700);
    stroke: var(--color-surface-400);
  }
  .chain-node-in .chain-node-box {
    stroke: var(--color-primary-500);
  }
  .chain-node-up .chain-node-box {
    stroke: var(--color-warning-500);
  }
  .chain-node-down .chain-node-box {
    stroke: var(--color-success-500);
  }
  .chain-node-selected .chain-node-box {
    fill: color-mix(in srgb, var(--color-primary-500) 14%, var(--color-surface-700));
  }

  .chain-node a {
    cursor: pointer;
  }
  .chain-node a:hover .chain-node-box {
    fill: var(--color-surface-600);
  }
  .chain-node a:focus-visible .chain-node-box {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  .chain-node-title {
    fill: var(--color-surface-50);
    font-size: 13px;
    font-weight: 600;
  }
  .chain-node-sub {
    fill: var(--color-surface-300);
    font-size: 11px;
  }

  .chain-node-open circle {
    fill: var(--color-surface-600);
    stroke: var(--color-surface-400);
    stroke-width: 1;
  }
  .chain-node-open path {
    stroke: var(--color-surface-100);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .chain-node-open:hover circle {
    fill: var(--color-primary-500);
  }
  .chain-node-open:hover path {
    stroke: var(--color-surface-950);
  }
</style>
