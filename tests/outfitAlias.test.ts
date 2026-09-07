import { expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { catalogSchema, conflictingItems, resolveBundle } from '../src/lib/outfits/catalog';
import { joinCatalog } from '../src/lib/outfits/search';
import type { NativeAsset } from '../src/lib/nativeAssets';

const preset = {
  itemId: 12220360,
  bodyVariant: 'female',
  slots: ['CL', 'PA'],
  parts: [
    { slot: 'CL', assetId: 'wardrobe-dc4bf9cb8925ea8c81d262a5' },
    { slot: 'PA', assetId: 'wardrobe-81b92384f7a2271d331682a9' }
  ],
  customize: { color: '1', colorPalette: '10', defaultColorIndex: '16' },
  cutting: [],
  availability: 'preview',
  reason: 'Converted source bundle; appearance has not been verified',
  limitations: ['Source exporter omitted attached features; see native manifest omitted records']
};
const input = { version: 1, nativeManifestVersion: 1, items: [preset] };
it('resolves the exact dress alias, retains dye metadata and replaces underlying pants', () => {
  const catalog = catalogSchema.parse(input);
  expect(input.items).toHaveLength(1);
  const alias = catalog.items.find((item) => item.itemId === 12220364)!;
  expect(alias.presetId).toBe(12220360);
  expect(alias.parts).toEqual(preset.parts);
  expect(alias.customize).toEqual(preset.customize);
  expect(alias.availability).toBe('preview');
  expect(alias.limitations).toEqual(preset.limitations);
  const item = joinCatalog([alias], [])[0];
  expect(item.name).toBe('Romantic Wedding Dress (F)');
  expect(item.is_outfit).toBe(1);
  const assets: NativeAsset[] = preset.parts.map((part) => ({
    id: part.assetId,
    slot: part.slot,
    bodyVariant: 'female',
    input: 'dress.nif',
    uri: 'dress.gltf',
    url: 'http://localhost/dress.gltf',
    skeleton: 'body.nif',
    clips: []
  }));
  const bundle = resolveBundle(item, assets, 'female');
  expect(bundle.slots).toEqual(['CL', 'PA']);
  const pants = { ...bundle, slots: ['PA'] };
  expect(conflictingItems([pants], bundle)).toEqual([pants]);
});
it('does not duplicate or replace explicit aliases', () => {
  const catalog = catalogSchema.parse(input);
  catalog.items.find((item) => item.itemId === 12220364)!.sourceName = 'Explicit entry';
  expect(catalogSchema.parse(catalog)).toEqual(catalog);
});
it('does not invent missing geometry or apply to a different body or release bundle', () => {
  for (const items of [
    [],
    [{ ...preset, bodyVariant: 'male' }],
    [{ ...preset, parts: [{ slot: 'CL', assetId: 'different' }] }]
  ])
    expect(
      catalogSchema.parse({ ...input, items }).items.some((item) => item.itemId === 12220364)
    ).toBe(false);
});
