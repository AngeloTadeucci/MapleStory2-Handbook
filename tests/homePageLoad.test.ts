import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  items: { findMany: vi.fn() },
  npcs: { findMany: vi.fn() },
  maps: { findMany: vi.fn() },
  achieves: { findMany: vi.fn() }
}));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: db }) }
}));

type Loader = () => Promise<{ props: Record<string, unknown> }>;
let load: Loader;

const queries = () => [db.items, db.npcs, db.maps, db.achieves];

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.clearAllMocks();
  for (const table of queries()) table.findMany.mockResolvedValue([]);
  load = (await import('../src/routes/+page.server')).load as unknown as Loader;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('home page load', () => {
  it('runs the four queries together', async () => {
    const releases: Array<() => void> = [];
    for (const table of queries()) {
      table.findMany.mockImplementation(
        () => new Promise((resolve) => releases.push(() => resolve([])))
      );
    }
    const pending = load();
    await Promise.resolve();
    expect(releases).toHaveLength(4);
    for (const release of releases) release();
    await pending;
  });

  it('serves a second load inside the window from the cache', async () => {
    const first = await load();
    vi.advanceTimersByTime(59_000);
    const second = await load();
    for (const table of queries()) expect(table.findMany).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('queries again once the window has passed', async () => {
    await load();
    vi.advanceTimersByTime(60_001);
    await load();
    for (const table of queries()) expect(table.findMany).toHaveBeenCalledTimes(2);
  });

  it('shares one load between concurrent requests', async () => {
    await Promise.all([load(), load(), load()]);
    for (const table of queries()) expect(table.findMany).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed load', async () => {
    db.npcs.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(load()).rejects.toThrow('db down');
    await expect(load()).resolves.toHaveProperty('props');
    expect(db.items.findMany).toHaveBeenCalledTimes(2);
    await load();
    expect(db.items.findMany).toHaveBeenCalledTimes(2);
  });
});
