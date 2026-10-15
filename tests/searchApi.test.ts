import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma }) }
}));

import { Prisma } from '../src/lib/generated/prisma/client';
import { GET as mapsGet } from '../src/routes/api/maps/+server';
import { GET as trophiesGet } from '../src/routes/api/trophies/+server';
import { GET as musicGet } from '../src/routes/api/music/+server';
import { GET as housingGet } from '../src/routes/api/housing/+server';
import { GET as itemsGet } from '../src/routes/api/items/+server';
import { GET as npcsGet } from '../src/routes/api/npcs/+server';
import { GET as questsGet } from '../src/routes/api/quests/+server';

type Handler = (event: never) => Promise<Response> | Response;
type Query = { sql: string; values: unknown[] };

let queries: Query[] = [];

beforeEach(() => {
  queries = [];
  prisma.$queryRaw.mockReset();
  prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = Prisma.sql(strings, ...values);
    queries.push({ sql: query.sql, values: query.values });
    return Promise.resolve(query.sql.includes('COUNT(*)') ? [{ count: 0n }] : []);
  });
});

async function get(handler: Handler, search: string) {
  const event = { url: new URL(`http://localhost/api/x?${search}`) };
  return handler(event as never);
}

const endpoints: [string, Handler][] = [
  ['maps', mapsGet as Handler],
  ['trophies', trophiesGet as Handler],
  ['music', musicGet as Handler],
  ['housing', housingGet as Handler],
  ['items', itemsGet as Handler],
  ['npcs', npcsGet as Handler],
  ['quests', questsGet as Handler]
];

describe.each(endpoints)('GET /api/%s', (_name, handler) => {
  it('binds a hostile search term instead of splicing it into the SQL', async () => {
    const payload = '"; DROP TABLE items; -- \'';
    const response = await get(handler, `search=${encodeURIComponent(payload)}`);
    expect(response.status).toBe(200);
    expect(queries.length).toBe(2);
    for (const query of queries) {
      expect(query.sql).not.toContain('DROP');
      expect(query.sql).not.toContain('"');
      expect(query.values).toContain(`%${payload}%`);
    }
  });

  it('binds limit and offset and never sends NaN', async () => {
    await get(handler, 'limit=abc&page=xyz');
    const [rows] = queries;
    expect(rows.sql).toContain('LIMIT ? OFFSET ?');
    const tail = rows.values.slice(-2);
    expect(tail.every((value) => Number.isInteger(value))).toBe(true);
    expect(tail[1]).toBe(0);
  });

  it('does not use a hard-coded schema prefix', async () => {
    await get(handler, '');
    for (const query of queries) {
      expect(query.sql).not.toContain('maple2_codex');
    }
  });
});

describe('page size caps', () => {
  it('lets the list pages request 200 rows', async () => {
    for (const [, handler] of endpoints.filter(([name]) => name !== 'music')) {
      queries = [];
      await get(handler, 'limit=200&page=2');
      expect(queries[0].values.slice(-2)).toEqual([200, 400]);
    }
  });

  it('caps every endpoint above 200 at 200, and music at 100', async () => {
    for (const [name, handler] of endpoints) {
      queries = [];
      await get(handler, 'limit=5000');
      expect(queries[0].values.slice(-2)).toEqual([name === 'music' ? 100 : 200, 0]);
    }
  });

  it('keeps each default limit', async () => {
    for (const [name, handler] of endpoints) {
      queries = [];
      await get(handler, '');
      expect(queries[0].values.slice(-2)).toEqual([name === 'music' ? 50 : 20, 0]);
    }
  });
});

describe('housing filters', () => {
  it('binds category, currency and buyable filters as numbers', async () => {
    await get(housingGet as Handler, 'category=3&currency=1&buyable=true');
    const [rows] = queries;
    expect(rows.sql).toContain('i.housing_category = ?');
    expect(rows.sql).toContain('fs.token_type = ?');
    expect(rows.sql).toContain('fs.buyable = 1');
    expect(rows.values.slice(0, 2)).toEqual([3, 1]);
  });

  it('matches nothing for an unknown category', async () => {
    await get(housingGet as Handler, 'category=999');
    expect(queries[0].sql).toContain('1 = 0');
  });
});

describe('level range filters', () => {
  it.each([
    ['npcs', npcsGet as Handler, 'minLevel=abc&maxLevel=&minLevel=1e999'],
    [
      'quests',
      questsGet as Handler,
      'minQuestLevel=abc&maxQuestLevel=x&minRequiredLevel=Infinity&maxRequiredLevel=-'
    ]
  ])('drops non-numeric %s level bounds instead of binding NaN', async (_name, handler, search) => {
    const response = await get(handler, search);
    expect(response.status).toBe(200);
    for (const query of queries) {
      expect(query.sql).not.toMatch(/level\s*[<>]=/i);
      expect(query.values.some((value) => Number.isNaN(value))).toBe(false);
    }
  });

  it('keeps numeric level bounds as bound values', async () => {
    await get(npcsGet as Handler, 'minLevel=10&maxLevel=60');
    expect(queries[0].sql).toMatch(/level >= \?/);
    expect(queries[0].values).toEqual(expect.arrayContaining([10, 60]));
  });
});
