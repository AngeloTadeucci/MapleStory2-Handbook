import { slotNumbers, type CatalogItem, type LibraryItem, searchSchema } from './catalog';
import type { z } from 'zod';

export type ItemLabel = Omit<CatalogItem, 'library'>;

function usableName(value: string | undefined): string {
  const name = value?.trim() ?? '';
  return /^ITEMNAME_\d+_/i.test(name) ? '' : name;
}

function usableIcon(value: string | null | undefined): string {
  const path = (value ?? '').replace(/\\/g, '/').toLowerCase();
  return /(^|\/)icon0\.png$/.test(path) ? '' : path;
}

/** The client inventory owns identity, body eligibility, slots and pagination. */
export function joinCatalog(entries: LibraryItem[], labels: ItemLabel[]): CatalogItem[] {
  const byId = new Map(labels.map((label) => [label.id, label]));
  return entries.map((entry) => {
    const label = byId.get(entry.itemId);
    return {
      id: entry.itemId,
      name: usableName(label?.name) || usableName(entry.sourceName) || `Item ${entry.itemId}`,
      icon_path: usableIcon(label?.icon_path) || usableIcon(entry.sourceIcon),
      gender: entry.bodyVariant === 'male' ? 0 : 1,
      slot: slotNumbers[entry.slots[0]] ?? 0,
      is_outfit: entry.isOutfit ?? label?.is_outfit ?? 0,
      rarity: label?.rarity,
      dyeable: entry.customize.color === '1' ? 1 : 0,
      kfms: [],
      library: entry
    };
  });
}

export function searchCatalog(items: CatalogItem[], query: z.infer<typeof searchSchema>) {
  const search = query.search.trim().toLocaleLowerCase();
  const matching = items
    .filter((item) => {
      const entry = item.library!;
      return (
        entry.bodyVariant === query.body &&
        (query.availability === 'all' ||
          (query.availability === 'verified'
            ? entry.availability === 'verified'
            : entry.availability !== 'unavailable')) &&
        (!query.slot ||
          (query.slot === 'full'
            ? entry.slots.includes('CL') && entry.slots.includes('PA')
            : entry.slots.includes(query.slot) ||
              (['RH', 'LH'].includes(query.slot) &&
                (Boolean(entry.handParts) ||
                  entry.slots.some((slot) => ['BH', 'RHLH'].includes(slot)))) ||
              (query.slot === 'RH' && entry.slots.includes('OH')))) &&
        (query.outfit === 'all' || Boolean(item.is_outfit) === (query.outfit === 'true')) &&
        (!search ||
          String(item.id) === search ||
          item.name.toLocaleLowerCase().includes(search) ||
          entry.sourceName?.toLocaleLowerCase().includes(search))
      );
    })
    .sort((a, b) => a.id - b.id);
  return {
    items: matching.slice(query.page * query.limit, (query.page + 1) * query.limit),
    total: matching.length,
    page: query.page,
    limit: query.limit
  };
}
