import type { CatalogItem } from './catalog';

export function parseOutfitItemId(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
}

export async function findOutfitItem(
  fetcher: typeof fetch,
  id: number,
  preferredBody: 'female' | 'male' = 'female',
  signal?: AbortSignal
): Promise<CatalogItem | undefined> {
  for (const body of [preferredBody, preferredBody === 'female' ? 'male' : 'female']) {
    const query = new URLSearchParams({
      body,
      search: String(id),
      availability: 'preview',
      limit: '48'
    });
    const response = await fetcher(`/api/outfits?${query}`, { signal });
    if (!response.ok) throw new Error('Unable to load this item. Please try again.');
    const result: { items: CatalogItem[] } = await response.json();
    const item = result.items.find(
      (item) =>
        item.id === id &&
        item.library?.bodyVariant === body &&
        item.library.availability !== 'unavailable'
    );
    if (item) return item;
  }
  return undefined;
}
