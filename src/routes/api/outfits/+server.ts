import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { applyHairPreviews, loadHairPreviews } from '$lib/outfits/hairPreviews';
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
type CatalogEntry = { expires: number; items: ReturnType<typeof joinCatalog> };
const cache = new Map<string, CatalogEntry>();
// Concurrent requests for the same key share one refresh. An entry is removed
// when its refresh settles, so a failed refresh is retried by the next request.
const inFlight = new Map<string, Promise<CatalogEntry>>();

type RefreshInput = {
  base: string;
  hairPreview: string;
  preview: string;
  fetch: typeof fetch;
  url: URL;
};

async function refreshCatalog({
  base,
  hairPreview,
  preview,
  fetch,
  url
}: RefreshInput): Promise<CatalogEntry> {
  const response = await fetch(`${base}simulator-catalog.json`);
  if (!response.ok) throw new Error('Model catalog is unavailable');
  const catalog = catalogSchema.parse(await response.json());
  if (catalog.items.some(hasApproximateHair) || hairPreview) {
    const manifestUrl = new URL(`${base}native-manifest.json`, url).href;
    const manifest = await fetch(manifestUrl);
    if (manifest.ok) {
      let assets = parseNativeManifest(await manifest.json(), manifestUrl);
      if (!preview) {
        assets = [...assets, ...(await loadHairPreviews(fetch, url.href))];
        catalog.items = applyHairPreviews(catalog.items, assets);
      }
      catalog.items = enableApproximateHair(catalog.items, assets);
    } else if (hairPreview) throw new Error('Base hair manifest is unavailable');
  }
  let labels: ItemLabel[] = [];
  try {
    if (!hairPreview) {
      // SELECT only. Missing database records and names do not remove source IDs.
      labels = await DBClient.getInstance().prisma.items.findMany({
        select: {
          id: true,
          name: true,
          icon_path: true,
          gender: true,
          slot: true,
          is_outfit: true,
          rarity: true,
          dyeable: true,
          kfms: true
        }
      });
    }
  } catch {
    console.warn('Outfit labels unavailable; using client source labels');
  }
  return { expires: Date.now() + 60_000, items: joinCatalog(catalog.items, labels) };
}

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
      let refresh = inFlight.get(cacheKey);
      if (!refresh) {
        refresh = refreshCatalog({
          base,
          hairPreview: query.hairPreview,
          preview: query.preview,
          fetch,
          url
        })
          .then((entry) => {
            if (cache.size >= 3) cache.delete(cache.keys().next().value!);
            cache.set(cacheKey, entry);
            return entry;
          })
          .finally(() => {
            inFlight.delete(cacheKey);
          });
        inFlight.set(cacheKey, refresh);
      }
      cached = await refresh;
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
