import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
const database = vi.hoisted(() => ({
  findMany: vi.fn(async () => []),
  count: vi.fn(async () => 0)
}));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: { items: database } }) }
}));
import { GET } from '../src/routes/api/outfits/+server';
import type { RequestEvent } from '@sveltejs/kit';

describe('outfit API slot filtering', () => {
  it('includes a known full outfit with database slot zero in all-item and top searches', async () => {
    for (const slot of ['', 'CL', 'PA']) {
      const event = {
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
                slots: ['CL', 'PA'],
                parts: [{ assetId: 'robe', slot: 'CL' }],
                customize: {},
                cutting: [],
                availability: 'verified',
                reason: ''
              }
            ]
          })
      } as unknown as RequestEvent;
      const response = await GET(event);
      expect(response.status).toBe(200);
      expect(database.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [{ OR: expect.arrayContaining([{ id: { in: [12200001] } }]) }]
          })
        })
      );
    }
  });
});
