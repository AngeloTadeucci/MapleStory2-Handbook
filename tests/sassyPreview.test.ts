import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
const database = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: { items: database } }) }
}));
import { GET } from '../src/routes/api/outfits/+server';
import { applySassyPreview, loadSassyPreview } from '../src/lib/outfits/sassyPreview';
import { catalogSchema, resolveBundle } from '../src/lib/outfits/catalog';
import { parseNativeManifest } from '../src/lib/nativeAssets';
import { joinCatalog } from '../src/lib/outfits/search';

const installed = [
  'sassy-pigtails-preview-01/native-manifest.json',
  'simulator-release-14/native-manifest.json',
  'simulator-release-14/simulator-catalog.json'
].every((p) => existsSync(`static/gltf/${p}`));
const read = (path: string): unknown => JSON.parse(readFileSync(`static/gltf/${path}`, 'utf8'));
const entries = installed
  ? catalogSchema.parse(read('simulator-release-14/simulator-catalog.json')).items
  : [];
const base = installed
  ? parseNativeManifest(
      read('simulator-release-14/native-manifest.json'),
      'http://localhost/gltf/simulator-release-14/native-manifest.json'
    )
  : [];
const exported = {
  version: 1,
  coordinateSystem: 'gltf-y-up-meters',
  assets: installed
    ? parseNativeManifest(
        read('sassy-pigtails-preview-01/native-manifest.json'),
        'http://localhost/gltf/sassy-pigtails-preview-01/native-manifest.json'
      )
    : []
};
const fetcher = vi.fn(async () => Response.json(exported));

describe.skipIf(!installed)('separate Sassy Pigtails preview', () => {
  it('serves the preview from local source metadata without reading the database', async () => {
    const response = await GET({
      url: new URL('http://localhost/api/outfits?hairPreview=sassy&search=10200010'),
      fetch: async (input: string | URL | Request) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          'http://localhost'
        );
        const path = url.pathname.replace('/gltf/', '');
        const fixture = ['simulator-catalog.json', 'native-manifest.json'].includes(path)
          ? `simulator-release-14/${path}`
          : path;
        return Response.json(read(fixture));
      }
    } as unknown as Parameters<typeof GET>[0]);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.items[0].library.availability).toBe('preview');
    expect(database.findMany).not.toHaveBeenCalled();
    const invalid = await GET({
      url: new URL('http://localhost/api/outfits?hairPreview=sassy&preview=gelo-07')
    } as Parameters<typeof GET>[0]);
    expect(invalid.status).toBe(400);
  });
  it('uses existing base forms and two independently authored tail identities', async () => {
    const tails = await loadSassyPreview(fetcher, 'http://localhost/');
    const assets = [...base, ...tails];
    const changed = applySassyPreview(entries, assets);
    const source = entries.find((e) => e.itemId === 10200010 && e.bodyVariant === 'female')!;
    expect(source.availability).toBe('unavailable');
    expect(changed.filter((e, i) => e !== entries[i])).toHaveLength(1);
    const item = joinCatalog(
      changed.filter((e) => e.itemId === 10200010),
      []
    )[0];
    const bundle = resolveBundle(item, assets, 'female');
    expect(bundle.parts).toHaveLength(3);
    for (const form of Object.values(bundle.forms!)) {
      expect(form).toHaveLength(3);
      expect(form.filter((p) => p.attachment?.replace === false)).toHaveLength(2);
      expect(form[0].url).toContain('/simulator-release-14/');
    }
    expect(tails[0].input).toBe(tails[1].input);
    expect(tails[0].attachmentSource).not.toBe(tails[1].attachmentSource);
    expect(item.library?.reason).toContain('approximate browser motion');
  });
  it('keeps usable explicit entries and rejects incomplete bundles', async () => {
    const tails = await loadSassyPreview(fetcher, 'http://localhost/');
    const assets = [...base, ...tails];
    const changed = applySassyPreview(entries, assets);
    expect(applySassyPreview(changed, assets)).toEqual(changed);
    expect(() => applySassyPreview(entries, [...base, tails[0]])).toThrow('both tails');
  });
  it('rejects a second tail that loses its KFM identity', async () => {
    const wrong = structuredClone(exported);
    wrong.assets[1].attachmentSource = wrong.assets[0].attachmentSource;
    await expect(
      loadSassyPreview(async () => Response.json(wrong), 'http://localhost/')
    ).rejects.toThrow('attachment identities');
  });
});
