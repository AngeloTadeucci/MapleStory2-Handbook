import { parseNativeManifest, type NativeAsset } from '$lib/nativeAssets';
import type { LibraryItem } from './catalog';
export async function loadCurlyPreview(fetcher: typeof fetch, origin: string) {
  const url = new URL('/gltf/curly-ponytail-preview-01/native-manifest.json', origin).href;
  const response = await fetcher(url);
  if (!response.ok) throw new Error('Curly Ponytail preview export is unavailable');
  const assets = parseNativeManifest(await response.json(), url);
  const a = assets[0];
  if (
    assets.length !== 1 ||
    a.id !== 'curly-ponytail-tail' ||
    a.itemId !== '10200070' ||
    a.slot !== 'HR' ||
    a.bodyVariant !== 'female' ||
    a.attachment?.replace !== false ||
    a.attachment.selfNode !== 'Point01' ||
    a.attachment.targetNode !== 'Bip01 Head' ||
    !a.input.endsWith('/10200070_f_rollingponytail_p_a.nif')
  )
    throw new Error('Invalid Curly Ponytail attachment identity');
  return assets;
}
export function applyCurlyPreview(entries: LibraryItem[], assets: NativeAsset[]): LibraryItem[] {
  if (!assets.some((a) => a.id === 'curly-ponytail-tail')) return entries;
  const forms: Record<string, string[]> = {};
  for (const form of ['a', 'c', 'd']) {
    const bases = assets.filter(
      (a) =>
        a.bodyVariant === 'female' &&
        a.slot === 'HR' &&
        a.attachment?.replace === true &&
        a.input.toLowerCase().endsWith(`/10200070_f_basichair01_${form}.nif`)
    );
    if (bases.length !== 1)
      throw new Error('Curly Ponytail requires its three explicit base forms');
    forms[form] = [bases[0].id, 'curly-ponytail-tail'];
  }
  return entries.map((entry) =>
    entry.itemId === 10200070 &&
    entry.bodyVariant === 'female' &&
    entry.availability === 'unavailable'
      ? {
          ...entry,
          parts: forms.a.map((assetId) => ({ assetId, slot: 'HR' })),
          hairForms: forms,
          availability: 'preview',
          reason: 'Authored placement available. Tail motion is not simulated.',
          limitations: [
            ...(entry.limitations ?? []),
            'Static tail preview. Source physics is omitted; client appearance is not verified.'
          ]
        }
      : entry
  );
}
