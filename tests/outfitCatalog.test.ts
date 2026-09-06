import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import {
  catalogSchema,
  conflictingItems,
  fitHair,
  resolveBundle,
  searchSchema,
  type CatalogItem,
  type OutfitBundle
} from '../src/lib/outfits/catalog';
import { frameAt } from '../src/lib/outfits/faceAnimation';
import { hidesBodyPart } from '../src/lib/outfits/bodyVisibility';
import type { NativeAsset } from '../src/lib/nativeAssets';

const part = (id: string, slot: string): NativeAsset => ({
  id,
  slot,
  input: 'item.nif',
  uri: `${id}.gltf`,
  url: `https://example.test/${id}.gltf`,
  skeleton: 'body.nif',
  clips: [],
  bodyVariant: 'female'
});
const item = (id: number, slots: string[]): CatalogItem => ({
  id,
  name: 'Clothing',
  icon_path: '',
  gender: 1,
  slot: 8,
  dyeable: 1,
  is_outfit: 1,
  kfms: [],
  library: {
    itemId: id,
    bodyVariant: 'female',
    slots,
    parts: slots.map((slot, i) => ({ slot, assetId: `${id}-${i}` })),
    customize: {},
    cutting: [],
    availability: 'preview',
    reason: ''
  }
});
const bundle = (id: number, slots: string[]): OutfitBundle => ({
  item: item(id, slots),
  slots,
  parts: slots.map((slot, i) => part(`${id}-${i}`, slot))
});

describe('outfit catalog and equipment rules', () => {
  it('fits only the same hair item and fails when the required authored form is missing', () => {
    const hair = {
      ...bundle(10200224, ['HR']),
      hairForm: 'a',
      forms: { c: [part('cap-hair', 'HR')] }
    };
    const fitted = fitHair(hair, 'c');
    expect(fitted.item.id).toBe(10200224);
    expect(fitted.parts[0].id).toBe('cap-hair');
    expect(fitHair(fitted, 'c')).toBe(fitted);
    expect(() => fitHair(hair, 'd')).toThrow('Remove the hat');
    expect(hair.hairForm).toBe('a');
  });
  it('resolves every explicit part and rejects partial, ambiguous and wrong-body outfits', () => {
    const robe = item(12200001, ['CL', 'PA']);
    const assets = [part('12200001-0', 'CL'), part('12200001-1', 'PA')];
    expect(resolveBundle(robe, assets, 'female').parts).toHaveLength(2);
    expect(() => resolveBundle(robe, assets.slice(0, 1), 'female')).toThrow('Missing');
    expect(() => resolveBundle(robe, [...assets, assets[0]], 'female')).toThrow('ambiguous');
    expect(() => resolveBundle(robe, assets, 'male')).toThrow('selected body');
  });
  it('one-piece outfits evict both slots, and either separate garment evicts the entire robe', () => {
    const top = bundle(1, ['CL']),
      pants = bundle(2, ['PA']),
      robe = bundle(3, ['CL', 'PA']),
      hat = bundle(4, ['CP']);
    expect(conflictingItems([top, pants, hat], robe)).toEqual([top, pants]);
    expect(conflictingItems([robe, hat], pants)).toEqual([robe]);
    expect(conflictingItems([robe, hat], top)).toEqual([robe]);
  });
  it('replaces robe legs and shoe skin without hiding unrelated similarly named meshes', () => {
    const pants = {
      ...part('pants', 'PA'),
      attachment: { slot: 'PA', selfNode: 'PA', targetNode: 'PA', replace: true, cutting: [] }
    };
    expect(hidesBodyPart('PA_Skin', [pants])).toBe(true);
    expect(hidesBodyPart('PA_Panty', [pants])).toBe(true);
    expect(hidesBodyPart('PAINT', [pants])).toBe(false);
    expect(hidesBodyPart('PA_Skin', [])).toBe(false);
  });
  it('rejects invalid pagination, unknown slots and duplicated item/body identity', () => {
    for (const values of [
      { page: -1 },
      { limit: 500 },
      { page: 'nan' },
      { slot: 'DROP TABLE items' }
    ])
      expect(searchSchema.safeParse(values).success).toBe(false);
    expect(searchSchema.parse({ search: "' OR 1=1 --" }).search).toBe("' OR 1=1 --");
    const entry = item(1, ['CL']).library;
    expect(
      catalogSchema.safeParse({ version: 1, nativeManifestVersion: 1, items: [entry, entry] })
        .success
    ).toBe(false);
  });
});
it('uses exact source blink boundaries, repeats blinks and holds expression endings', () => {
  const delays = [800, 60, 50, 2000];
  expect(frameAt(delays, 799, true)).toBe(0);
  expect(frameAt(delays, 800, true)).toBe(1);
  expect(frameAt(delays, 860, true)).toBe(2);
  expect(frameAt(delays, 2910, true)).toBe(0);
  expect(frameAt(delays, 2910, false)).toBe(3);
  expect(frameAt(delays, 100000, false)).toBe(3);
});
