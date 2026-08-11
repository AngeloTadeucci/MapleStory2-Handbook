/**
 * Layered layout for the quest chain graph.
 *
 * Ported from the standalone prototype in MapleStory2-XML/docs/quest-graph.
 * Two properties of the real data drive the shape of this code and must not be
 * simplified away:
 *
 * 1. The graph is NOT acyclic. Quests (and chapters) unlock each other in both
 *    directions in places, so a plain topological sort walks only part of the
 *    graph and leaves the rest without a layer, which lands as NaN in the
 *    coordinates. Back edges are found with an iterative DFS and held out of
 *    the layering pass. They are still returned so the caller can draw them.
 * 2. Layer indices must come out contiguous from 0 and the per-layer buckets
 *    must be dense. A sparse bucket array combined with Math.max(...spread)
 *    produces NaN and a layout tens of thousands of pixels wide.
 *
 * The layout is deterministic: same input, same coordinates, so it renders
 * identically on the server and on the client.
 */

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  /** Horizontal gap between layers. */
  gapX: number;
  /** Vertical gap between nodes in a column. */
  gapY: number;
  /** Horizontal gap between the sub-columns a wide layer is wrapped into. */
  columnGapX: number;
  /**
   * Nodes per column before a layer wraps into another sub-column. Without
   * this, one quest unlocking 300 others becomes a single column tens of
   * thousands of pixels tall.
   */
  maxPerColumn: number;
  /**
   * Width budget for one band of layers. A 300 quest line laid out in a single
   * row is 57000px wide, so the layers are wrapped into bands that alternate
   * direction, the way text wraps. A layer wider than this on its own still
   * gets its own band.
   */
  bandWidth: number;
  /** Vertical gap between bands. */
  bandGapY: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 232,
  nodeHeight: 58,
  gapX: 76,
  gapY: 16,
  columnGapX: 20,
  maxPerColumn: 14,
  bandWidth: 1600,
  bandGapY: 48
};

export interface LayoutEdgeInput {
  from: number;
  to: number;
}

export interface LaidOutNode<T> {
  item: T;
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  /**
   * 1 when the node sits in a band that reads left to right, -1 when it sits in
   * one that reads right to left. Edges leave a node on its direction side and
   * enter on the other, which is what makes the turn between bands readable.
   */
  direction: 1 | -1;
  /**
   * Which row of the serpentine this node landed in, numbered across the whole
   * layout rather than per chain, so that two nodes sharing a band id really do
   * sit on the same row of the drawing. The caller uses it to group nodes into
   * the regions it paints behind them.
   */
  band: number;
}

export interface LaidOutEdge<T, E> {
  edge: E;
  source: LaidOutNode<T>;
  target: LaidOutNode<T>;
  /** True when the edge points backwards, i.e. it took part in a cycle. */
  reversed: boolean;
}

export interface LayoutResult<T, E> {
  nodes: Array<LaidOutNode<T>>;
  edges: Array<LaidOutEdge<T, E>>;
  width: number;
  height: number;
}

interface Block<T> {
  nodes: Array<LaidOutNode<T>>;
  edgeIndices: number[];
  width: number;
  height: number;
}

/**
 * Lay out a directed graph left to right. Nodes need an `id`; edges reference
 * those ids. Edges whose endpoints are not both present are dropped.
 */
export function layoutChainGraph<T extends { id: number }, E extends LayoutEdgeInput>(
  nodes: T[],
  edges: E[],
  options: Partial<LayoutOptions> = {}
): LayoutResult<T, E> {
  const opt: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  if (nodes.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const present = new Set(nodes.map((n) => n.id));
  const liveEdges = edges.filter((e) => present.has(e.from) && present.has(e.to));

  // Each weakly connected chain is laid out on its own and the resulting blocks
  // are flowed into rows. Sharing layers across unrelated chains would pile
  // every root into one very tall first column.
  const groups = splitComponents(nodes, liveEdges);
  const laidBlocks: Array<{ block: Block<T>; reversed: Set<number> }> = groups.map((group) =>
    layoutComponent(group.nodes, group.edgeIndices, liveEdges, opt)
  );

  laidBlocks.sort((a, b) => b.block.nodes.length - a.block.nodes.length);

  const padX = opt.gapX * 2;
  const padY = opt.gapY * 5;
  // Blocks flow into the same width budget the bands use, so unrelated chains
  // sit side by side only while they fit and the whole graph keeps to one
  // column of scrolling.
  let widestBlock = 0;
  for (const { block } of laidBlocks) {
    if (block.width > widestBlock) widestBlock = block.width;
  }
  const rowWidth = Math.max(opt.bandWidth, widestBlock);

  const placed: Array<LaidOutNode<T>> = [];
  const reversedEdges = new Set<number>();
  const usedEdgeIndices: number[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let width = 0;
  // Each chain numbers its own bands from 0. Shifting them past every band
  // placed so far keeps the ids unique, so nodes from two chains that happen to
  // be drawn side by side are never mistaken for one row.
  let bandOffset = 0;

  for (const { block, reversed } of laidBlocks) {
    if (cursorX > 0 && cursorX + block.width > rowWidth) {
      cursorX = 0;
      cursorY += rowHeight + padY;
      rowHeight = 0;
    }
    let blockBands = 0;
    for (const node of block.nodes) {
      if (node.band + 1 > blockBands) blockBands = node.band + 1;
    }
    for (const node of block.nodes) {
      node.x += cursorX;
      node.y += cursorY;
      node.band += bandOffset;
      placed.push(node);
    }
    bandOffset += blockBands;
    for (const index of block.edgeIndices) {
      usedEdgeIndices.push(index);
    }
    for (const index of reversed) {
      reversedEdges.add(index);
    }
    rowHeight = Math.max(rowHeight, block.height);
    cursorX += block.width + padX;
    width = Math.max(width, cursorX - padX);
  }

  const nodeById = new Map<number, LaidOutNode<T>>();
  for (const node of placed) {
    nodeById.set(node.id, node);
  }

  const resultEdges: Array<LaidOutEdge<T, E>> = [];
  for (const index of usedEdgeIndices) {
    const edge = liveEdges[index];
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (!source || !target) continue;
    resultEdges.push({ edge, source, target, reversed: reversedEdges.has(index) });
  }

  return {
    nodes: placed,
    edges: resultEdges,
    width,
    height: cursorY + rowHeight
  };
}

function splitComponents<T extends { id: number }, E extends LayoutEdgeInput>(
  nodes: T[],
  edges: E[]
): Array<{ nodes: T[]; edgeIndices: number[] }> {
  const neighbours = new Map<number, number[]>();
  for (const node of nodes) {
    neighbours.set(node.id, []);
  }
  edges.forEach((edge) => {
    neighbours.get(edge.from)?.push(edge.to);
    neighbours.get(edge.to)?.push(edge.from);
  });

  const label = new Map<number, number>();
  let next = 0;
  for (const node of nodes) {
    if (label.has(node.id)) continue;
    const stack = [node.id];
    label.set(node.id, next);
    while (stack.length > 0) {
      const current = stack.pop() as number;
      for (const other of neighbours.get(current) ?? []) {
        if (!label.has(other)) {
          label.set(other, next);
          stack.push(other);
        }
      }
    }
    next++;
  }

  const groups: Array<{ nodes: T[]; edgeIndices: number[] }> = [];
  for (let i = 0; i < next; i++) {
    groups.push({ nodes: [], edgeIndices: [] });
  }
  for (const node of nodes) {
    groups[label.get(node.id) as number].nodes.push(node);
  }
  edges.forEach((edge, index) => {
    const group = label.get(edge.from);
    if (group !== undefined) groups[group].edgeIndices.push(index);
  });
  return groups;
}

function layoutComponent<T extends { id: number }, E extends LayoutEdgeInput>(
  nodes: T[],
  edgeIndices: number[],
  allEdges: E[],
  opt: LayoutOptions
): { block: Block<T>; reversed: Set<number> } {
  const count = nodes.length;
  const indexOf = new Map<number, number>();
  nodes.forEach((node, i) => indexOf.set(node.id, i));

  const outAdj: number[][] = [];
  const inAdj: number[][] = [];
  for (let i = 0; i < count; i++) {
    outAdj.push([]);
    inAdj.push([]);
  }

  // Pairs of (edgeIndex, from, to) for edges that live inside this component.
  const localEdges: Array<{ index: number; from: number; to: number }> = [];
  for (const index of edgeIndices) {
    const edge = allEdges[index];
    const from = indexOf.get(edge.from);
    const to = indexOf.get(edge.to);
    if (from === undefined || to === undefined || from === to) continue;
    outAdj[from].push(to);
    inAdj[to].push(from);
    localEdges.push({ index, from, to });
  }

  // Cycle break: an iterative DFS marks every edge that points back at a node
  // still on the stack. Those edges are excluded from layering only.
  const mark = new Uint8Array(count); // 0 unseen, 1 on stack, 2 done
  const backEdges = new Set<string>();
  for (let start = 0; start < count; start++) {
    if (mark[start] !== 0) continue;
    mark[start] = 1;
    const stack: Array<[number, number]> = [[start, 0]];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top[1] < outAdj[top[0]].length) {
        const next = outAdj[top[0]][top[1]++];
        if (mark[next] === 1) {
          backEdges.add(`${top[0]}>${next}`);
        } else if (mark[next] === 0) {
          mark[next] = 1;
          stack.push([next, 0]);
        }
      } else {
        mark[top[0]] = 2;
        stack.pop();
      }
    }
  }

  // Longest path layering over the remaining DAG. A node only ever lands one
  // past a predecessor, so layers stay contiguous from 0.
  const dagOut: number[][] = [];
  for (let i = 0; i < count; i++) dagOut.push([]);
  const indegree = new Array<number>(count).fill(0);
  for (const edge of localEdges) {
    if (backEdges.has(`${edge.from}>${edge.to}`)) continue;
    dagOut[edge.from].push(edge.to);
    indegree[edge.to]++;
  }

  const layer = new Array<number>(count).fill(0);
  const queue: number[] = [];
  for (let i = 0; i < count; i++) {
    if (indegree[i] === 0) queue.push(i);
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    for (const j of dagOut[i]) {
      if (layer[j] < layer[i] + 1) layer[j] = layer[i] + 1;
      if (--indegree[j] === 0) queue.push(j);
    }
  }
  // Defensive: removing DFS back edges leaves an acyclic graph, so every node
  // should have been queued. If that ever stops holding, place the leftovers
  // rather than leaving them with a stale layer.
  if (queue.length < count) {
    for (let i = 0; i < count; i++) {
      if (indegree[i] > 0) {
        indegree[i] = 0;
        queue.push(i);
      }
    }
  }

  let depth = 1;
  for (let i = 0; i < count; i++) {
    if (layer[i] + 1 > depth) depth = layer[i] + 1;
  }

  // Dense buckets, one per layer, no holes.
  const byLayer: number[][] = [];
  for (let i = 0; i < depth; i++) byLayer.push([]);
  for (let i = 0; i < count; i++) byLayer[layer[i]].push(i);
  for (const bucket of byLayer) {
    bucket.sort((a, b) => nodes[a].id - nodes[b].id);
  }

  const position = new Array<number>(count).fill(0);
  for (const bucket of byLayer) {
    bucket.forEach((node, k) => {
      position[node] = k;
    });
  }

  // Barycentre ordering sweeps, alternating direction, to shorten edges.
  for (let sweep = 0; sweep < 6; sweep++) {
    const forward = sweep % 2 === 0;
    const order: number[] = [];
    for (let i = 0; i < depth; i++) order.push(forward ? i : depth - 1 - i);
    for (const layerIndex of order) {
      if (layerIndex === (forward ? 0 : depth - 1)) continue;
      const bucket = byLayer[layerIndex];
      const key = new Map<number, number>();
      for (const node of bucket) {
        const neighbours = forward ? inAdj[node] : outAdj[node];
        let sum = 0;
        let seen = 0;
        for (const neighbour of neighbours) {
          sum += position[neighbour];
          seen++;
        }
        key.set(node, seen > 0 ? sum / seen : position[node]);
      }
      bucket.sort(
        (a, b) => (key.get(a) as number) - (key.get(b) as number) || position[a] - position[b]
      );
      bucket.forEach((node, k) => {
        position[node] = k;
      });
    }
  }

  // A layer wider than maxPerColumn wraps into sub-columns.
  const rowsInLayer: number[] = [];
  const layerWidth: number[] = [];
  for (let i = 0; i < depth; i++) {
    const size = byLayer[i].length;
    const columns = Math.max(1, Math.ceil(size / opt.maxPerColumn));
    const rows = Math.max(1, Math.ceil(size / columns));
    rowsInLayer.push(rows);
    layerWidth.push(columns * opt.nodeWidth + (columns - 1) * opt.columnGapX);
  }

  // Layers are grouped into bands that fit the width budget. A layer that
  // busts the budget on its own still gets placed rather than dropped.
  const bands: number[][] = [];
  const bandWidths: number[] = [];
  let band: number[] = [];
  let bandWidth = 0;
  for (let i = 0; i < depth; i++) {
    const grown = band.length === 0 ? layerWidth[i] : bandWidth + opt.gapX + layerWidth[i];
    if (band.length > 0 && grown > opt.bandWidth) {
      bands.push(band);
      bandWidths.push(bandWidth);
      band = [i];
      bandWidth = layerWidth[i];
    } else {
      band.push(i);
      bandWidth = grown;
    }
  }
  bands.push(band);
  bandWidths.push(bandWidth);

  // Odd bands read right to left, so they are aligned to the right edge of the
  // widest band. That puts the end of one band and the start of the next on the
  // same side, which is what the turn between them hangs off.
  let widest = 0;
  for (const value of bandWidths) {
    if (value > widest) widest = value;
  }

  const laid: Array<LaidOutNode<T>> = new Array(count);
  let bandTop = 0;
  for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
    const layers = bands[bandIndex];
    const direction: 1 | -1 = bandIndex % 2 === 0 ? 1 : -1;
    let tallest = 1;
    for (const layerIndex of layers) {
      if (rowsInLayer[layerIndex] > tallest) tallest = rowsInLayer[layerIndex];
    }

    let cursor = 0;
    for (const layerIndex of layers) {
      const left = direction === 1 ? cursor : widest - cursor - layerWidth[layerIndex];
      const bucket = byLayer[layerIndex];
      const rows = rowsInLayer[layerIndex];
      // Centre each layer against the tallest one in its band.
      const offsetY = ((tallest - rows) * (opt.nodeHeight + opt.gapY)) / 2;
      bucket.forEach((node, k) => {
        const column = Math.floor(k / rows);
        const row = k % rows;
        // Sub-columns run the way the band does, so a wide layer reads in the
        // same direction as everything around it.
        const columnStep = column * (opt.nodeWidth + opt.columnGapX);
        laid[node] = {
          item: nodes[node],
          id: nodes[node].id,
          x:
            direction === 1
              ? left + columnStep
              : left + layerWidth[layerIndex] - opt.nodeWidth - columnStep,
          y: bandTop + row * (opt.nodeHeight + opt.gapY) + offsetY,
          width: opt.nodeWidth,
          height: opt.nodeHeight,
          layer: layerIndex,
          direction,
          band: bandIndex
        };
      });
      cursor += layerWidth[layerIndex] + opt.gapX;
    }

    bandTop += tallest * (opt.nodeHeight + opt.gapY) - opt.gapY + opt.bandGapY;
  }

  let maxX = 0;
  let maxY = 0;
  for (const node of laid) {
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  }

  const reversed = new Set<number>();
  for (const edge of localEdges) {
    if (backEdges.has(`${edge.from}>${edge.to}`)) reversed.add(edge.index);
  }

  return {
    block: {
      nodes: laid,
      edgeIndices: localEdges.map((edge) => edge.index),
      width: maxX + opt.nodeWidth,
      height: maxY + opt.nodeHeight
    },
    reversed
  };
}
