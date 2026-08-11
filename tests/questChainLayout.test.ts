import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT_OPTIONS,
  layoutChainGraph,
  type LayoutEdgeInput,
  type LayoutResult
} from '../src/lib/helpers/questChainLayout';

interface TestNode {
  id: number;
}

function nodes(ids: number[]): TestNode[] {
  return ids.map((id) => ({ id }));
}

function edges(pairs: Array<[number, number]>): LayoutEdgeInput[] {
  return pairs.map(([from, to]) => ({ from, to }));
}

function assertFinite(result: LayoutResult<TestNode, LayoutEdgeInput>) {
  expect(Number.isFinite(result.width)).toBe(true);
  expect(Number.isFinite(result.height)).toBe(true);
  for (const node of result.nodes) {
    expect(Number.isFinite(node.x), `x for node ${node.id}`).toBe(true);
    expect(Number.isFinite(node.y), `y for node ${node.id}`).toBe(true);
    expect(node.x).toBeGreaterThanOrEqual(0);
    expect(node.y).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(node.layer)).toBe(true);
    expect(node.layer).toBeGreaterThanOrEqual(0);
  }
}

describe('layoutChainGraph', () => {
  it('returns an empty layout for no nodes', () => {
    const result = layoutChainGraph<TestNode, LayoutEdgeInput>([], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    assertFinite(result);
  });

  it('lays a simple line out left to right', () => {
    const result = layoutChainGraph(
      nodes([1, 2, 3]),
      edges([
        [1, 2],
        [2, 3]
      ])
    );
    assertFinite(result);
    const byId = new Map(result.nodes.map((node) => [node.id, node]));
    expect(byId.get(1)!.layer).toBe(0);
    expect(byId.get(2)!.layer).toBe(1);
    expect(byId.get(3)!.layer).toBe(2);
    expect(byId.get(1)!.x).toBeLessThan(byId.get(2)!.x);
    expect(byId.get(2)!.x).toBeLessThan(byId.get(3)!.x);
  });

  // The real chapter graph has 32 pairs that unlock each other in both
  // directions, and the quest graph is not guaranteed acyclic either. A naive
  // topological sort never drains its queue and every coordinate comes out NaN.
  it('survives a two node cycle', () => {
    const result = layoutChainGraph(
      nodes([1, 2]),
      edges([
        [1, 2],
        [2, 1]
      ])
    );
    assertFinite(result);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(2);
    expect(result.edges.some((edge) => edge.reversed)).toBe(true);
  });

  it('survives a long cycle and a cycle with a tail', () => {
    const ring = layoutChainGraph(
      nodes([1, 2, 3, 4, 5]),
      edges([
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 1]
      ])
    );
    assertFinite(ring);
    expect(ring.nodes).toHaveLength(5);

    const tailed = layoutChainGraph(
      nodes([1, 2, 3, 4]),
      edges([
        [1, 2],
        [2, 3],
        [3, 2],
        [3, 4]
      ])
    );
    assertFinite(tailed);
    expect(tailed.nodes).toHaveLength(4);
  });

  it('survives a self loop', () => {
    const result = layoutChainGraph(
      nodes([1, 2]),
      edges([
        [1, 1],
        [1, 2]
      ])
    );
    assertFinite(result);
    expect(result.nodes).toHaveLength(2);
  });

  it('wraps a wide fan into columns instead of one enormous row', () => {
    const fanSize = 150;
    const ids = [0, ...Array.from({ length: fanSize }, (_, index) => index + 1)];
    const result = layoutChainGraph(
      nodes(ids),
      edges(Array.from({ length: fanSize }, (_, index) => [0, index + 1] as [number, number]))
    );
    assertFinite(result);
    expect(result.nodes).toHaveLength(fanSize + 1);

    // Every fanned out node sits on layer 1, but they must not all share a
    // column: an unwrapped layer would be fanSize * nodeHeight tall.
    const layerOne = result.nodes.filter((node) => node.layer === 1);
    expect(layerOne).toHaveLength(fanSize);
    const distinctX = new Set(layerOne.map((node) => node.x));
    expect(distinctX.size).toBeGreaterThan(1);
    expect(result.height).toBeLessThan(
      fanSize * (DEFAULT_LAYOUT_OPTIONS.nodeHeight + DEFAULT_LAYOUT_OPTIONS.gapY)
    );
  });

  it('wraps a long chain into bands that alternate direction', () => {
    const length = 40;
    const ids = Array.from({ length }, (_, index) => index + 1);
    const result = layoutChainGraph(
      nodes(ids),
      edges(Array.from({ length: length - 1 }, (_, index) => [index + 1, index + 2]))
    );
    assertFinite(result);

    // One band holds six layers at the default width, so a 40 quest line has to
    // turn several times instead of running off to the right.
    expect(result.width).toBeLessThan(
      length * (DEFAULT_LAYOUT_OPTIONS.nodeWidth + DEFAULT_LAYOUT_OPTIONS.gapX)
    );

    const ordered = [...result.nodes].sort((a, b) => a.layer - b.layer);
    const bands: Array<Array<(typeof ordered)[number]>> = [];
    for (const node of ordered) {
      const last = bands[bands.length - 1];
      if (!last || last[0].direction !== node.direction || last[0].y !== node.y) {
        bands.push([node]);
      } else {
        last.push(node);
      }
    }
    expect(bands.length).toBeGreaterThan(1);

    bands.forEach((band, index) => {
      const expected = index % 2 === 0 ? 1 : -1;
      expect(band[0].direction).toBe(expected);
      for (let i = 1; i < band.length; i++) {
        // Inside a band the chain reads the way the band points.
        if (expected === 1) expect(band[i].x).toBeGreaterThan(band[i - 1].x);
        else expect(band[i].x).toBeLessThan(band[i - 1].x);
      }
      // Every band after the first sits below the one before it.
      if (index > 0) expect(band[0].y).toBeGreaterThan(bands[index - 1][0].y);
    });
  });

  it('numbers bands across the whole layout, not per chain', () => {
    // Three chains that fit side by side. If each numbered its bands from 0,
    // nodes from different chains would claim to share a row and the chapter
    // shading drawn from those ids would merge boxes that are not adjacent.
    const result = layoutChainGraph(
      nodes([1, 2, 3, 4, 5, 6]),
      edges([
        [1, 2],
        [3, 4],
        [5, 6]
      ])
    );
    assertFinite(result);
    for (const node of result.nodes) {
      expect(Number.isInteger(node.band)).toBe(true);
      expect(node.band).toBeGreaterThanOrEqual(0);
    }

    const bandOf = new Map(result.nodes.map((node) => [node.id, node.band]));
    // Within a chain both quests sit on the same band, and no two chains share
    // one, so three single band chains produce three distinct ids.
    expect(bandOf.get(1)).toBe(bandOf.get(2));
    expect(bandOf.get(3)).toBe(bandOf.get(4));
    expect(bandOf.get(5)).toBe(bandOf.get(6));
    expect(new Set(bandOf.values()).size).toBe(3);
  });

  it('keeps disconnected components inside the reported bounds', () => {
    const result = layoutChainGraph(
      nodes([1, 2, 3, 4, 5, 6]),
      edges([
        [1, 2],
        [3, 4],
        [5, 6]
      ])
    );
    assertFinite(result);
    for (const node of result.nodes) {
      expect(node.x + node.width).toBeLessThanOrEqual(result.width);
      expect(node.y + node.height).toBeLessThanOrEqual(result.height);
    }
  });

  it('is deterministic so server and client render the same coordinates', () => {
    const ids = nodes([5, 1, 4, 2, 3]);
    const links = edges([
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
      [4, 5]
    ]);
    const first = layoutChainGraph(ids, links);
    const second = layoutChainGraph([...ids].reverse(), links);
    const firstById = new Map(first.nodes.map((node) => [node.id, `${node.x},${node.y}`]));
    for (const node of second.nodes) {
      expect(firstById.get(node.id)).toBe(`${node.x},${node.y}`);
    }
  });

  it('resolves every edge to a placed node', () => {
    const result = layoutChainGraph(
      nodes([1, 2, 3]),
      edges([
        [1, 2],
        [2, 3],
        [3, 1]
      ])
    );
    for (const edge of result.edges) {
      expect(result.nodes).toContain(edge.source);
      expect(result.nodes).toContain(edge.target);
    }
  });

  it('drops edges that point at nodes outside the set', () => {
    const result = layoutChainGraph(
      nodes([1, 2]),
      edges([
        [1, 2],
        [2, 999]
      ])
    );
    assertFinite(result);
    expect(result.edges).toHaveLength(1);
  });
});
