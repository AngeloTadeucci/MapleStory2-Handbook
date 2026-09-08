import { parseNativeManifest, type NativeAsset } from '$lib/nativeAssets';
import type { LibraryItem } from './catalog';

export const twinTailPreviewBase = '/gltf/twin-tails-preview-01/';
// KMS itemmodel/102.xml declares Banded's shared BasicHair02 base explicitly.
const sources = [
  {
    id: 10200011,
    tail: '00200011_f_puretwintail',
    base: '00200010_f_basichair02',
    second: 'banded-twin-tails-2'
  },
  {
    id: 10200012,
    tail: '00200012_f_cutetwintail',
    base: '00200012_f_basichair03',
    second: 'cutesy-twin-tails-2'
  }
];

export async function loadTwinTailPreview(fetcher: typeof fetch, origin: string) {
  const url = new URL(`${twinTailPreviewBase}native-manifest.json`, origin).href;
  const response = await fetcher(url);
  if (!response.ok) throw new Error('Twin-tail preview export is unavailable');
  const assets = parseNativeManifest(await response.json(), url);
  if (
    assets.length !== 2 ||
    sources.some((source) => {
      const asset = assets.find((a) => a.id === source.second);
      return (
        !asset ||
        asset.itemId !== String(source.id) ||
        asset.bodyVariant !== 'female' ||
        asset.slot !== 'HR' ||
        asset.uri !== `wardrobe/${source.second}.gltf` ||
        !asset.input.toLowerCase().endsWith(`/${source.tail}_p_a.nif`) ||
        !asset.attachmentSource?.toLowerCase().endsWith(`/${source.tail}_p2_a.kfm`) ||
        asset.attachment?.replace !== false ||
        asset.attachment.selfNode !== 'Point01' ||
        asset.attachment.targetNode !== 'Bip01 Head'
      );
    })
  )
    throw new Error('Invalid twin-tail attachment identities');
  return assets;
}

export function applyTwinTailPreview(entries: LibraryItem[], assets: NativeAsset[]): LibraryItem[] {
  return entries.map((entry) => {
    const source = sources.find((s) => s.id === entry.itemId);
    if (!source || entry.bodyVariant !== 'female' || entry.availability !== 'unavailable')
      return entry;
    const first = assets.filter(
      (a) =>
        a.itemId === String(source.id) &&
        a.bodyVariant === 'female' &&
        a.attachment?.replace === false &&
        a.input.toLowerCase().endsWith(`/${source.tail}_p_a.nif`) &&
        a.id !== source.second
    );
    const second = assets.filter((a) => a.id === source.second);
    if (first.length !== 1 || second.length !== 1)
      throw new Error('Twin-tail preview needs both explicit attachments');
    const forms: Record<string, string[]> = {};
    for (const form of ['a', 'c', 'd']) {
      const base = assets.filter(
        (a) =>
          a.bodyVariant === 'female' &&
          a.slot === 'HR' &&
          a.attachment?.replace === true &&
          a.input.toLowerCase().endsWith(`/${source.base}_${form}.nif`)
      );
      if (base.length !== 1) throw new Error('Twin-tail preview needs every declared base form');
      forms[form] = [base[0].id, first[0].id, second[0].id];
    }
    return {
      ...entry,
      parts: forms.a.map((assetId) => ({ assetId, slot: 'HR' })),
      hairForms: forms,
      availability: 'preview',
      reason: 'Both authored tail attachments available.',
      limitations: [
        ...(entry.limitations ?? []),
        'Local twin-tail preview. Authored placement is available; these tails do not yet have browser motion.'
      ]
    };
  });
}
