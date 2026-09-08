import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { loadHairPreviews, applyHairPreviews } from '../src/lib/outfits/hairPreviews';
import { enableApproximateHair } from '../src/lib/outfits/approximateHair';
import { catalogSchema, resolveBundle } from '../src/lib/outfits/catalog';
import { parseNativeManifest } from '../src/lib/nativeAssets';
import { joinCatalog } from '../src/lib/outfits/search';
const read = (path: string): unknown => JSON.parse(readFileSync(`static${path}`, 'utf8'));
describe.skipIf(!existsSync('static/gltf/curly-ponytail-preview-01/native-manifest.json'))(
  'installed normal hair picker',
  () => {
    it('resolves all newly accessible hairs and audits every remaining unavailable identity', async () => {
      const origin = 'http://localhost';
      const base = '/gltf/simulator-release-14/';
      const assets = [
        ...parseNativeManifest(
          read(base + 'native-manifest.json'),
          origin + base + 'native-manifest.json'
        ),
        ...(await loadHairPreviews(
          async (input) => Response.json(read(new URL(String(input)).pathname)),
          origin
        ))
      ];
      const entries = enableApproximateHair(
        applyHairPreviews(catalogSchema.parse(read(base + 'simulator-catalog.json')).items, assets),
        assets
      );
      for (const id of [10200010, 10200011, 10200012, 10200070]) {
        const item = joinCatalog(
          entries.filter((e) => e.itemId === id),
          []
        )[0];
        expect(item.library?.availability).toBe('preview');
        const bundle = resolveBundle(item, assets, 'female');
        expect(Object.keys(bundle.forms!)).toEqual(['a', 'c', 'd']);
        for (const parts of Object.values(bundle.forms!))
          expect(parts.length).toBe(id === 10200070 ? 2 : 3);
      }
      expect(
        entries
          .filter((e) => e.slots.includes('HR') && e.availability === 'unavailable')
          .map((e) => e.itemId)
      ).toEqual([10200031, 10200159, 10200246, 10200260, 10200262, 10200263]);
    });
    it('keeps absent optional preview exports from breaking the base catalog', async () => {
      expect(
        await loadHairPreviews(async () => new Response('', { status: 404 }), 'http://localhost')
      ).toEqual([]);
    });
  }
);
