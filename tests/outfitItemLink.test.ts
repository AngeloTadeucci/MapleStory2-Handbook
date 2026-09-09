import { describe, expect, it, vi } from 'vitest';
import { findOutfitItem, parseOutfitItemId } from '../src/lib/outfits/itemLink';
import type { CatalogItem } from '../src/lib/outfits/catalog';

function item(id: number, body: 'male' | 'female', unavailable = false): CatalogItem {
  return {
    id,
    name: 'Test item',
    icon_path: '',
    gender: body === 'male' ? 0 : 1,
    slot: 1,
    is_outfit: 1,
    dyeable: 1,
    kfms: [],
    library: {
      itemId: id,
      bodyVariant: body,
      slots: ['HR'],
      parts: [],
      customize: {},
      cutting: [],
      availability: unavailable ? 'unavailable' : 'preview',
      reason: ''
    }
  };
}

describe('item links into the outfit simulator', () => {
  it('selects the exact ID on the preferred body, ignoring other search results', async () => {
    const target = item(10200047, 'female');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ items: [item(47, 'female'), target] }));
    expect(await findOutfitItem(fetcher, target.id)).toEqual(target);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('falls back to the other compatible body', async () => {
    const target = item(10200001, 'male');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(Response.json({ items: [target] }));
    expect(await findOutfitItem(fetcher, target.id)).toEqual(target);
    expect(String(fetcher.mock.calls[0][0])).toContain('body=female');
    expect(String(fetcher.mock.calls[1][0])).toContain('body=male');
  });

  it('does not equip unavailable items or results for the wrong body', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [item(1, 'male')] }))
      .mockResolvedValueOnce(Response.json({ items: [item(1, 'male', true)] }));
    expect(await findOutfitItem(fetcher, 1)).toBeUndefined();
  });

  it('reports a catalog failure and supports cancellation', async () => {
    const signal = new AbortController().signal;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    await expect(findOutfitItem(fetcher, 1, 'male', signal)).rejects.toThrow(
      'Unable to load this item'
    );
    expect(fetcher.mock.calls[0][1]?.signal).toBe(signal);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([null, '', '0', '-1', '1.5', 'NaN', '1e3', '2147483648', '10200047x'])(
    'rejects invalid item ID %s',
    (value) => expect(parseOutfitItemId(value)).toBeUndefined()
  );
  it('accepts a valid item ID', () => expect(parseOutfitItemId('10200047')).toBe(10200047));
});
