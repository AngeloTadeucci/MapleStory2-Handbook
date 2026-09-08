import { dev } from '$app/environment';
import { parseNativeManifest, type NativeAsset } from '$lib/nativeAssets';
import type { LibraryItem } from './catalog';

export const sassyPreviewBase = '/gltf/sassy-pigtails-preview-01/';
const tailIds = ['sassy-pigtails-tail-1', 'sassy-pigtails-tail-2'];

export async function loadSassyPreview(fetcher: typeof fetch, origin: string) {
  if (!dev) throw new Error('Hair previews are local only');
  const url = new URL(`${sassyPreviewBase}native-manifest.json`, origin).href;
  const response = await fetcher(url);
  if (!response.ok) throw new Error('Sassy Pigtails preview export is unavailable');
  const assets = parseNativeManifest(await response.json(), url);
  if (
    assets.length !== 2 ||
    tailIds.some((id, index) => {
      const asset = assets.find((a) => a.id === id);
      const stem = index === 0 ? '00200010_f_pipi_p_a' : '00200010_f_pipi_p2_a';
      return (
        !asset ||
        asset.itemId !== '10200010' ||
        asset.bodyVariant !== 'female' ||
        asset.slot !== 'HR' ||
        !asset.input.toLowerCase().endsWith('/00200010_f_pipi_p_a.nif') ||
        asset.uri !== `wardrobe/${id}.gltf` ||
        asset.attachment?.replace !== false ||
        asset.attachment.selfNode !== 'Point01' ||
        asset.attachment.targetNode !== 'Bip01 Head' ||
        !asset.attachmentSource?.toLowerCase().endsWith(`/${stem}.kfm`)
      );
    })
  )
    throw new Error('Invalid Sassy Pigtails attachment identities');
  return assets;
}

export function applySassyPreview(entries: LibraryItem[], assets: NativeAsset[]): LibraryItem[] {
  const forms: Record<string, string[]> = {};
  for (const form of ['a', 'c', 'd']) {
    const bases = assets.filter(
      (a) =>
        a.itemId === '10200010' &&
        a.bodyVariant === 'female' &&
        a.slot === 'HR' &&
        a.attachment?.replace === true &&
        a.input.toLowerCase().endsWith(`/00200010_f_basichair02_${form}.nif`)
    );
    if (bases.length !== 1 || tailIds.some((id) => assets.filter((a) => a.id === id).length !== 1))
      throw new Error('Sassy Pigtails preview requires all base forms and both tails');
    forms[form] = [bases[0].id, ...tailIds];
  }
  return entries.map((entry) =>
    entry.itemId === 10200010 &&
    entry.bodyVariant === 'female' &&
    entry.availability === 'unavailable'
      ? {
          ...entry,
          parts: forms.a.map((assetId) => ({ assetId, slot: 'HR' })),
          hairForms: forms,
          availability: 'preview',
          reason: 'Authored tail placements and optional approximate browser motion available.',
          limitations: [
            ...(entry.limitations ?? []),
            'Optional browser gravity and sway use a simple head collider. Shoulder and hat collisions are not implemented.',
            'Local Sassy Pigtails preview. Client visual parity has not been established.'
          ]
        }
      : entry
  );
}
