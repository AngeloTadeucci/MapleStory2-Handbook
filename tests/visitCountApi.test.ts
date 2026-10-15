import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({
  items: { updateMany: vi.fn() },
  npcs: { updateMany: vi.fn() },
  maps: { updateMany: vi.fn() },
  quests: { updateMany: vi.fn() },
  achieves: { updateMany: vi.fn() }
}));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma }) }
}));

import { POST as itemsPost } from '../src/routes/api/items/+server';
import { POST as npcsPost } from '../src/routes/api/npcs/+server';
import { POST as mapsPost } from '../src/routes/api/maps/+server';
import { POST as questsPost } from '../src/routes/api/quests/+server';
import { POST as trophiesPost } from '../src/routes/api/trophies/+server';

type VisitEvent = Parameters<typeof itemsPost>[0];

let nextIp = 0;
const freshIp = () => `10.0.0.${++nextIp}`;

function visit(handler: typeof itemsPost, id: string | null, ip: string) {
  const query = id == null ? '' : `?id=${encodeURIComponent(id)}`;
  return handler({
    url: new URL(`http://localhost/api/x${query}`),
    getClientAddress: () => ip
  } as unknown as VisitEvent);
}

const endpoints = [
  ['items', itemsPost, prisma.items],
  ['npcs', npcsPost, prisma.npcs],
  ['maps', mapsPost, prisma.maps],
  ['quests', questsPost, prisma.quests],
  ['trophies', trophiesPost, prisma.achieves]
] as const;

beforeEach(() => {
  for (const [, , table] of endpoints) {
    table.updateMany.mockReset();
    table.updateMany.mockResolvedValue({ count: 1 });
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe.each(endpoints)('POST /api/%s', (_name, handler, table) => {
  it.each([null, '', 'abc', '-1', '1.5', '1e3', ' 5', '5 ', '1;DROP', '2147483648'])(
    'rejects id %j with 400 and never touches the database',
    async (id) => {
      const response = await visit(handler, id, freshIp());
      expect(response.status).toBe(400);
      expect(table.updateMany).not.toHaveBeenCalled();
    }
  );

  it('returns 404 when no row matches', async () => {
    table.updateMany.mockResolvedValue({ count: 0 });
    const response = await visit(handler, '123', freshIp());
    expect(response.status).toBe(404);
  });

  it('increments by an integer id and returns an empty 200', async () => {
    const response = await visit(handler, '0123', freshIp());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(table.updateMany).toHaveBeenCalledTimes(1);
    expect(table.updateMany).toHaveBeenCalledWith({
      where: { id: 123 },
      data: { visit_count: { increment: 1 } }
    });
  });

  it('allows two visits per IP and entity, then answers 429 without updating', async () => {
    const ip = freshIp();
    expect((await visit(handler, '55', ip)).status).toBe(200);
    expect((await visit(handler, '55', ip)).status).toBe(200);
    const blocked = await visit(handler, '55', ip);
    expect(blocked.status).toBe(429);
    expect(table.updateMany).toHaveBeenCalledTimes(2);
  });

  it('does not let a zero-padded id dodge the limit', async () => {
    const ip = freshIp();
    await visit(handler, '77', ip);
    await visit(handler, '077', ip);
    expect((await visit(handler, '0077', ip)).status).toBe(429);
  });

  it('counts other IPs and other ids separately', async () => {
    const ip = freshIp();
    await visit(handler, '9', ip);
    await visit(handler, '9', ip);
    expect((await visit(handler, '9', ip)).status).toBe(429);
    expect((await visit(handler, '9', freshIp())).status).toBe(200);
    expect((await visit(handler, '10', ip)).status).toBe(200);
  });

  it('answers 500, not 429, when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    table.updateMany.mockRejectedValue(new Error('connection lost'));
    const response = await visit(handler, '123', freshIp());
    expect(response.status).toBe(500);
  });
});

describe('response bodies', () => {
  it('items sends a JSON message outside production', async () => {
    const response = await visit(itemsPost, 'abc', freshIp());
    expect(await response.json()).toEqual({ message: 'Invalid item id' });
  });

  it('items sends empty bodies in production', async () => {
    vi.stubEnv('PUBLIC_NODE_ENV', 'prod');
    const missing = await visit(itemsPost, null, freshIp());
    expect(missing.status).toBe(400);
    expect(await missing.text()).toBe('');

    prisma.items.updateMany.mockResolvedValue({ count: 0 });
    const notFound = await visit(itemsPost, '1', freshIp());
    expect(notFound.status).toBe(404);
    expect(await notFound.text()).toBe('');
  });

  it('other endpoints keep their JSON messages even in production', async () => {
    vi.stubEnv('PUBLIC_NODE_ENV', 'prod');
    const response = await visit(npcsPost, null, freshIp());
    expect(await response.json()).toEqual({ message: 'No npc id provided' });
  });
});
