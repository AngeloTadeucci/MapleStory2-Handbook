import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { catalogSchema } from '../src/lib/outfits/catalog';
import { parseNativeManifest } from '../src/lib/nativeAssets';
import { enableApproximateHair } from '../src/lib/outfits/approximateHair';

describe.skipIf(!existsSync('static/gltf/simulator-release-14/native-manifest.json'))(
  'approximate hair from the packaged release',
  () => {
    it('enables placement-only failures with distinct hat forms while preserving other blockers', () => {
      const root = 'static/gltf/simulator-release-14/';
      const catalog = catalogSchema.parse(
        JSON.parse(readFileSync(root + 'simulator-catalog.json', 'utf8'))
      );
      const assets = parseNativeManifest(
        JSON.parse(readFileSync(root + 'native-manifest.json', 'utf8')),
        'http://localhost/gltf/native-manifest.json'
      );
      const updated = enableApproximateHair(catalog.items, assets);
      const flower = updated.find((entry) => entry.itemId === 10200008)!;
      expect(flower.availability).toBe('preview');
      expect(flower.parts).toHaveLength(2);
      expect(flower.hairForms?.c).toHaveLength(2);
      expect(flower.hairForms?.c[0]).not.toBe(flower.parts[0].assetId);
      expect(flower.reason).toContain('Authored hair placement');
      expect(updated.find((entry) => entry.itemId === 10200010)?.availability).toBe('unavailable');
      expect(catalog.items.find((entry) => entry.itemId === 10200008)?.parts).toEqual([]);
      expect(updated.filter((entry, index) => entry !== catalog.items[index])).toHaveLength(26);
      expect(
        updated.filter(
          (entry, index) =>
            entry.availability === 'preview' && catalog.items[index].availability === 'unavailable'
        )
      ).toHaveLength(25);
      expect(updated.find((entry) => entry.itemId === 10200031)?.availability).toBe('unavailable');
      expect(updated.find((entry) => entry.itemId === 10200031)?.reason).toContain(
        'hair-direction texture'
      );
    });
  }
);
