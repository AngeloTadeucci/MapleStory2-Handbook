import type { NativeAsset } from '$lib/nativeAssets';
import type { LibraryItem } from './catalog';
import { loadSassyPreview, applySassyPreview } from './sassyPreview';
import { loadTwinTailPreview, applyTwinTailPreview } from './twinTailPreview';
import { loadCurlyPreview, applyCurlyPreview } from './curlyPreview';
export async function loadHairPreviews(fetcher: typeof fetch, origin: string) {
  const results = await Promise.allSettled([
    loadSassyPreview(fetcher, origin),
    loadTwinTailPreview(fetcher, origin),
    loadCurlyPreview(fetcher, origin)
  ]);
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
export function applyHairPreviews(entries: LibraryItem[], assets: NativeAsset[]) {
  let result = entries;
  if (assets.some((a) => a.id === 'sassy-pigtails-tail-1'))
    result = applySassyPreview(result, assets);
  if (assets.some((a) => a.id === 'banded-twin-tails-2'))
    result = applyTwinTailPreview(result, assets);
  return applyCurlyPreview(result, assets);
}
