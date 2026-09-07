import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import DBClient from '$lib/prismaClient';
import { parseNativeManifest } from '$lib/nativeAssets';
import { enableApproximateHair, hasApproximateHair } from '$lib/outfits/approximateHair';
import {
  catalogSchema,
  characterPreviewBase,
  libraryBase,
  searchSchema
} from '$lib/outfits/catalog';
import { joinCatalog, searchCatalog, type ItemLabel } from '$lib/outfits/search';

// Metadata only. Geometry stays lazy. Cache avoids a full SELECT and schema
// parse on every keystroke. Private preview indexes remain separate.
const cache = new Map<string, { expires: number; items: ReturnType<typeof joinCatalog> }>();

export const GET: RequestHandler = async ({ url, fetch }) => {
  const parsed = searchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return json({ message: 'Invalid outfit search filters' }, { status: 400 });
  const query = parsed.data;
  try {
    const base = query.preview ? characterPreviewBase(query.preview) : libraryBase;
    let cached = cache.get(base);
    if (!cached || cached.expires <= Date.now()) {
      const response = await fetch(`${base}simulator-catalog.json`);
      if (!response.ok) throw new Error('Model catalog is unavailable');
      const catalog = catalogSchema.parse(await response.json());
      if (catalog.items.some(hasApproximateHair)) {
        const manifestUrl = new URL(`${base}native-manifest.json`, url).href;
        const manifest = await fetch(manifestUrl);
        if (manifest.ok) {
          catalog.items = enableApproximateHair(
            catalog.items,
            parseNativeManifest(await manifest.json(), manifestUrl)
          );
        }
      }
      let labels: ItemLabel[] = [];
      try {
        // SELECT only. Missing database records and names do not remove source IDs.
        labels = await DBClient.getInstance().prisma.items.findMany({
          select: {
            id: true,
            name: true,
            icon_path: true,
            gender: true,
            slot: true,
            is_outfit: true,
            dyeable: true,
            kfms: true
          }
        });
      } catch {
        console.warn('Outfit labels unavailable; using client source labels');
      }
      cached = { expires: Date.now() + 60_000, items: joinCatalog(catalog.items, labels) };
      if (cache.size >= 3) cache.delete(cache.keys().next().value!);
      cache.set(base, cached);
    }
    return json(searchCatalog(cached.items, query));
  } catch (cause) {
    console.error(
      'Outfit catalog query failed',
      cause instanceof Error ? cause.message : 'Unknown error'
    );
    return json(
      { message: 'Unable to load the clothing catalog. Please try again.' },
      { status: 503 }
    );
  }
};
