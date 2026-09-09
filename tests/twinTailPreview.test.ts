import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
const database = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: { items: database } }) }
}));
import { GET } from '../src/routes/api/outfits/+server';
import { parseNativeManifest } from '../src/lib/nativeAssets';
import { catalogSchema, resolveBundle } from '../src/lib/outfits/catalog';
import { joinCatalog } from '../src/lib/outfits/search';
import { applyTwinTailPreview, loadTwinTailPreview } from '../src/lib/outfits/twinTailPreview';

const read = (path: string): unknown => JSON.parse(readFileSync(`static/gltf/${path}`, 'utf8'));
const installed = [
  'simulator-release-14/native-manifest.json',
  'simulator-release-14/simulator-catalog.json',
  'twin-tails-preview-01/native-manifest.json'
].every((p) => existsSync(`static/gltf/${p}`));
const fetcher = (async (url: string | URL | Request) => {
  const path = new URL(String(url), 'http://localhost').pathname.replace('/gltf/', '');
  const fixture = ['simulator-catalog.json', 'native-manifest.json'].includes(path)
    ? `simulator-release-14/${path}`
    : path;
  return new Response(JSON.stringify(read(fixture)));
}) as typeof fetch;

describe.skipIf(!installed)('explicit twin-tail previews', () => {
  it('resolves both hairstyles from exact shared models without changing release entries', async () => {
    const base = parseNativeManifest(
      read('simulator-release-14/native-manifest.json'),
      'http://localhost/gltf/simulator-release-14/native-manifest.json'
    );
    const extra = await loadTwinTailPreview(fetcher, 'http://localhost');
    const assets = [...base, ...extra];
    const entries = catalogSchema.parse(read('simulator-release-14/simulator-catalog.json')).items;
    const updated = applyTwinTailPreview(entries, assets);
    expect(updated.filter((e, i) => e !== entries[i])).toHaveLength(2);
    for (const id of [10200011, 10200012]) {
      const item = joinCatalog(updated, []).find((i) => i.id === id && i.gender === 1)!;
      const bundle = resolveBundle(item, assets, 'female');
      expect(bundle.parts).toHaveLength(3);
      expect(bundle.parts[1].input.split('/').at(-1)).toBe(bundle.parts[2].input.split('/').at(-1));
      expect(bundle.parts[2].attachmentSource).toContain('_p2_a.kfm');
      expect(
        item.library?.hairForms &&
          Object.values(item.library.hairForms).every((f) => f.length === 3)
      ).toBe(true);
      expect(entries.find((e) => e.itemId === id)?.availability).toBe('unavailable');
    }
    expect(() => applyTwinTailPreview(entries, base)).toThrow('both explicit attachments');
    const usable = updated.map((e) =>
      e.itemId === 10200011 ? { ...e, availability: 'verified' as const } : e
    );
    expect(applyTwinTailPreview(usable, assets).find((e) => e.itemId === 10200011)).toBe(
      usable.find((e) => e.itemId === 10200011)
    );
  });
  it('serves the local preview without a database query', async () => {
    const response = await GET({
      url: new URL('http://localhost/api/outfits?hairPreview=twins&search=10200011'),
      fetch: fetcher
    } as Parameters<typeof GET>[0]);
    expect(response.status).toBe(200);
    expect((await response.json()).items[0].library.parts).toHaveLength(3);
    expect(database.findMany).not.toHaveBeenCalled();
  });
  it('rejects a mismatched second-tail identity', async () => {
    const invalid = read('twin-tails-preview-01/native-manifest.json') as {
      assets: { attachmentSource: string }[];
    };
    invalid.assets[0].attachmentSource = invalid.assets[0].attachmentSource.replace(
      '_p2_a',
      '_p_a'
    );
    await expect(
      loadTwinTailPreview(
        (async () => new Response(JSON.stringify(invalid))) as typeof fetch,
        'http://localhost'
      )
    ).rejects.toThrow('identities');
  });
});
