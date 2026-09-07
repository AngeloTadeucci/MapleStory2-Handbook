import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { catalogSchema, searchSchema, type LibraryItem } from '../src/lib/outfits/catalog';
import { joinCatalog, searchCatalog } from '../src/lib/outfits/search';

const entry = (id: number, body: 'male' | 'female', slots = ['EY']): LibraryItem => ({
  itemId: id,
  bodyVariant: body,
  slots,
  parts: [],
  customize: {},
  cutting: [],
  availability: 'unavailable',
  reason: 'Missing source',
  sourceName: id === 1 ? 'Source glasses' : ''
});

describe('complete wardrobe discovery', () => {
  it('defaults discovery to all items and normalizes source icon paths', () => {
    expect(searchSchema.parse({}).availability).toBe('all');
    expect(
      joinCatalog([{ ...entry(2, 'male'), sourceName: 'ITEMNAME_2_NAME:[F]Develop' }], [])[0].name
    ).toBe('Item 2');
    const source = {
      ...entry(1, 'female'),
      sourceIcon: './Data/Resource/Image/Item/Icon/Test.png'
    };
    expect(joinCatalog([source], [])[0].icon_path).toBe('./data/resource/image/item/icon/test.png');
  });
  it('keeps authored hair weights above one without accepting invalid numbers', () => {
    const value = {
      version: 1,
      nativeManifestVersion: 1,
      items: [{ ...entry(10200008, 'female', ['HR']), hairScales: [[0.8, 1, 1.2]] }]
    };
    expect(catalogSchema.safeParse(value).success).toBe(true);
    value.items[0].hairScales = [[Infinity]];
    expect(catalogSchema.safeParse(value).success).toBe(false);
  });
  it('preserves unnamed IDs and eligible body pairs despite shared geometry and absent database rows', () => {
    const items = joinCatalog([entry(1, 'female'), entry(2, 'female'), entry(2, 'male')], []);
    expect(items.map((i) => i.name)).toEqual(['Source glasses', 'Item 2', 'Item 2']);
    for (const body of ['male', 'female']) {
      const result = searchCatalog(
        items,
        searchSchema.parse({ body, search: '2', availability: 'all' })
      );
      expect(result.total).toBe(1);
      expect(result.items[0].library?.bodyVariant).toBe(body);
    }
    expect(searchCatalog(items, searchSchema.parse({ availability: 'verified' })).total).toBe(0);
    expect(
      searchCatalog(
        items,
        searchSchema.parse({ availability: 'all', slot: 'EY', page: 1, limit: 1 })
      ).items[0].id
    ).toBe(2);
  });
  it('permits absent geometry only when visibly unavailable', () => {
    const value = { version: 1, nativeManifestVersion: 1, items: [entry(1, 'female')] };
    expect(catalogSchema.safeParse(value).success).toBe(true);
    expect(
      catalogSchema.safeParse({
        ...value,
        items: [{ ...entry(1, 'female'), availability: 'preview' }]
      }).success
    ).toBe(false);
  });
});

const root = process.env.WARDROBE_LIBRARY_DIR;
const path = root && resolve(root, 'simulator-catalog.json');
it.skipIf(!path || !existsSync(path))(
  'enumerates every source-backed pair through paginated discovery',
  () => {
    const catalog = catalogSchema.parse(JSON.parse(readFileSync(path!, 'utf8')));
    const sourcePath = process.env.WARDROBE_INVENTORY;
    if (sourcePath) {
      const source: { items: { itemId: number; bodyVariant: string }[] } = JSON.parse(
        readFileSync(sourcePath, 'utf8')
      );
      const keys = (entries: { itemId: number; bodyVariant: string }[]) =>
        entries.map((i) => `${i.itemId}:${i.bodyVariant}`).sort();
      expect(keys(catalog.items)).toEqual(keys(source.items));
    }
    const items = joinCatalog(catalog.items, []);
    for (const body of ['male', 'female']) {
      const expected = catalog.items
        .filter((i) => i.bodyVariant === body)
        .map((i) => i.itemId)
        .sort((a, b) => a - b);
      const found: number[] = [];
      for (let page = 0; found.length < expected.length; page++) {
        const result = searchCatalog(
          items,
          searchSchema.parse({ body, availability: 'all', limit: 48, page })
        );
        expect(result.total).toBe(expected.length);
        expect(result.items.length).toBeGreaterThan(0);
        found.push(...result.items.map((i) => i.id));
      }
      expect(found).toEqual(expected);
    }
  },
  60_000
);
