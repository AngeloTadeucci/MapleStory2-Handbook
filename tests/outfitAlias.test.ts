import { expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { catalogSchema, conflictingItems, resolveBundle } from '../src/lib/outfits/catalog';
import { joinCatalog } from '../src/lib/outfits/search';
import type { NativeAsset } from '../src/lib/nativeAssets';
import aliases from '../src/lib/outfits/catalog-aliases.json';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseNativeManifest } from '../src/lib/nativeAssets';

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

it.each(aliases)('preserves the exact preset and restrictions for alias $itemId', (mapping) => {
  const source = { ...preset, ...mapping, itemId: mapping.presetId };
  const parsed = catalogSchema.parse({ ...input, items: [source] });
  const alias = parsed.items.find((item) => item.itemId === mapping.itemId)!;
  expect(alias).toEqual({ ...parsed.items[0], itemId: mapping.itemId });
  expect(alias.customize).toEqual(preset.customize);
  expect(alias.limitations).toEqual(preset.limitations);
  expect(catalogSchema.parse(parsed)).toEqual(parsed);

  const explicit = {
    ...source,
    itemId: mapping.itemId,
    availability: 'unavailable',
    reason: 'Explicit blocker'
  };
  const preserved = catalogSchema.parse({ ...input, items: [source, explicit] });
  expect(preserved.items.find((item) => item.itemId === mapping.itemId)?.reason).toBe(
    'Explicit blocker'
  );
  for (const changed of [
    { ...source, bodyVariant: 'male' },
    { ...source, slots: ['FA'] },
    { ...source, parts: [...source.parts, { slot: 'FA', assetId: 'unexpected' }] },
    {
      ...source,
      availability: mapping.availability === 'preview' ? 'unavailable' : 'preview',
      parts: preset.parts
    }
  ]) {
    expect(
      catalogSchema
        .parse({ ...input, items: [changed] })
        .items.some((item) => item.itemId === mapping.itemId)
    ).toBe(false);
  }
});

const release = resolve('static/gltf/simulator-release-14');
it.skipIf(!existsSync(resolve(release, 'simulator-catalog.json')))(
  'resolves every usable alias against the installed release and keeps the blocked orb unavailable',
  () => {
    const raw = JSON.parse(
      readFileSync(resolve(release, 'simulator-catalog.json'), 'utf8')
    ) as unknown;
    const catalog = catalogSchema.parse(raw);
    const manifest: unknown = JSON.parse(
      readFileSync(resolve(release, 'native-manifest.json'), 'utf8')
    );
    const assets = parseNativeManifest(
      manifest,
      'http://localhost/gltf/simulator-release-14/native-manifest.json'
    );
    for (const mapping of aliases) {
      const alias = catalog.items.find(
        (item) => item.itemId === mapping.itemId && item.bodyVariant === mapping.bodyVariant
      )!;
      const source = catalog.items.find(
        (item) => item.itemId === mapping.presetId && item.bodyVariant === mapping.bodyVariant
      )!;
      expect(alias).toEqual({
        ...source,
        itemId: mapping.itemId,
        presetId: mapping.presetId,
        sourceName: mapping.sourceName,
        isOutfit: mapping.isOutfit
      });
      const item = joinCatalog([alias], [])[0];
      if (mapping.availability === 'unavailable') {
        expect(alias.reason).toContain('Source animation targets require attachment support');
        expect(() => resolveBundle(item, assets, 'female')).toThrow('not available');
        continue;
      }
      const bundle = resolveBundle(item, assets, 'female');
      expect(bundle.parts.map((part) => part.id)).toEqual(
        mapping.parts.map((part) => part.assetId)
      );
      for (const part of bundle.parts) {
        const path = resolve(release, part.uri);
        const gltf = JSON.parse(readFileSync(path, 'utf8')) as {
          meshes: unknown[];
          buffers?: { uri?: string }[];
          images?: { uri?: string }[];
        };
        expect(gltf.meshes.length).toBeGreaterThan(0);
        for (const dependency of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
          if (dependency.uri && !dependency.uri.startsWith('data:'))
            expect(existsSync(resolve(dirname(path), dependency.uri))).toBe(true);
        }
      }
    }
  }
);
