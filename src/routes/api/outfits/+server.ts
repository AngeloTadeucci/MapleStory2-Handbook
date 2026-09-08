import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { applySassyPreview, loadSassyPreview } from '$lib/outfits/sassyPreview';
import { applyTwinTailPreview, loadTwinTailPreview } from '$lib/outfits/twinTailPreview';
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
  if (query.hairPreview && (!dev || query.preview))
    return json({ message: 'Invalid local hair preview' }, { status: 400 });
  try {
    const base = query.preview ? characterPreviewBase(query.preview) : libraryBase;
    const cacheKey = `${base}?hairPreview=${query.hairPreview}`;
    let cached = cache.get(cacheKey);
    if (!cached || cached.expires <= Date.now()) {
      const response = await fetch(`${base}simulator-catalog.json`);
      if (!response.ok) throw new Error('Model catalog is unavailable');
      const catalog = catalogSchema.parse(await response.json());
      if (catalog.items.some(hasApproximateHair) || query.hairPreview) {
        const manifestUrl = new URL(`${base}native-manifest.json`, url).href;
        const manifest = await fetch(manifestUrl);
        if (manifest.ok) {
          let assets = parseNativeManifest(await manifest.json(), manifestUrl);
          if (query.hairPreview) {
            assets = [...assets, ...(await loadSassyPreview(fetch, url.href))];
            catalog.items = applySassyPreview(catalog.items, assets);
            if (query.hairPreview === 'twins') {
              assets = [...assets, ...(await loadTwinTailPreview(fetch, url.href))];
              catalog.items = applyTwinTailPreview(catalog.items, assets);
            }
          }
          catalog.items = enableApproximateHair(catalog.items, assets);
        } else if (query.hairPreview) throw new Error('Base hair manifest is unavailable');
      }
      let labels: ItemLabel[] = [];
      try {
        if (!query.hairPreview) {
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
        }
      } catch {
        console.warn('Outfit labels unavailable; using client source labels');
      }
      cached = { expires: Date.now() + 60_000, items: joinCatalog(catalog.items, labels) };
      if (cache.size >= 3) cache.delete(cache.keys().next().value!);
      cache.set(cacheKey, cached);
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
