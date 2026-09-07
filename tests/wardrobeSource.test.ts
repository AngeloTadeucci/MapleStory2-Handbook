import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { joinCatalog, searchCatalog } from '../src/lib/outfits/search';
import { searchSchema, type LibraryItem } from '../src/lib/outfits/catalog';

describe('inventory source precedence', () => {
  it('uses DB labels without overriding source eligibility, full slots or outfit status', () => {
    const entry: LibraryItem = {
      itemId: 7,
      bodyVariant: 'female',
      sourceName: 'Source',
      isOutfit: 1,
      slots: ['CL', 'PA'],
      parts: [],
      customize: {},
      cutting: [],
      availability: 'unavailable',
      reason: 'Missing'
    };
    const rows = joinCatalog(
      [entry],
      [
        {
          id: 7,
          name: 'Localized',
          icon_path: '',
          gender: 0,
          slot: 0,
          is_outfit: 0,
          dyeable: 0,
          kfms: []
        }
      ]
    );
    expect(rows[0].name).toBe('Localized');
    expect(
      searchCatalog(
        rows,
        searchSchema.parse({ availability: 'all', body: 'female', slot: 'full', outfit: 'true' })
      ).total
    ).toBe(1);
    expect(
      searchCatalog(rows, searchSchema.parse({ availability: 'all', body: 'male' })).total
    ).toBe(0);
    expect(
      searchCatalog(rows, searchSchema.parse({ availability: 'all', search: 'Source' })).total
    ).toBe(1);
  });
});
