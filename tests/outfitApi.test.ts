import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
const database = vi.hoisted(() => ({ findMany: vi.fn(async () => []) }));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: { items: database } }) }
}));
import { GET } from '../src/routes/api/outfits/+server';
type OutfitRequest = Parameters<typeof GET>[0];

describe('source-owned outfit API', () => {
  it('finds a DB-missing full outfit in all, top and pants searches', async () => {
    for (const slot of ['', 'CL', 'PA']) {
      const response = await GET({
        url: new URL(
          `http://localhost/api/outfits?availability=all&body=female&slot=${slot}&search=12200001`
        ),
        fetch: async () =>
          Response.json({
            version: 1,
            nativeManifestVersion: 1,
            items: [
              {
                itemId: 12200001,
                bodyVariant: 'female',
                sourceName: '',
                slots: ['CL', 'PA'],
                parts: [],
                customize: {},
                cutting: [],
                availability: 'unavailable',
                reason: 'Missing source'
              }
            ]
          })
      } as unknown as OutfitRequest);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 12200001,
        name: 'Item 12200001',
        library: { reason: 'Missing source' }
      });
    }
    expect(database.findMany).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid filters before reading any source', async () => {
    const fetch = vi.fn();
    const response = await GET({
      url: new URL('http://localhost/api/outfits?limit=999'),
      fetch
    } as unknown as OutfitRequest);
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
