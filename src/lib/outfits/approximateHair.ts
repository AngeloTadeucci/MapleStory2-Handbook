import type { NativeAsset } from '$lib/nativeAssets';
import type { LibraryItem } from './catalog';

const placementBlocker =
  'Authored ponytail placement and joint-angle controls are not implemented; source custom/jointangle records are retained in the inventory';

export function hasApproximateHair(entry: LibraryItem): boolean {
  return (
    entry.availability === 'unavailable' &&
    entry.slots.length === 1 &&
    entry.slots[0] === 'HR' &&
    entry.reason === placementBlocker
  );
}

// Reuse exported geometry without changing the release catalog or its review evidence.
export function enableApproximateHair(
  entries: LibraryItem[],
  assets: NativeAsset[]
): LibraryItem[] {
  return entries.map((entry) => {
    if (!hasApproximateHair(entry)) return entry;
    if (entry.itemId === 10200031)
      return {
        ...entry,
        reason:
          'The exported Curled Pigtails ponytail materials are missing their hair-direction texture.'
      };
    const candidates = assets.filter(
      (asset) =>
        asset.itemId === String(entry.presetId ?? entry.itemId) &&
        asset.bodyVariant === entry.bodyVariant &&
        asset.slot === 'HR'
    );
    const common = candidates.filter((asset) => asset.attachment?.replace === false);
    const forms: Record<string, string[]> = {};
    for (const form of ['a', 'c', 'd']) {
      const bases = candidates.filter(
        (asset) =>
          asset.attachment?.replace === true && asset.input.toLowerCase().endsWith(`_${form}.nif`)
      );
      if (bases.length === 1) forms[form] = [...bases, ...common].map((asset) => asset.id);
    }
    if (!forms.a) return entry;
    const warning = 'Authored hair placement presets available. Physics motion is not simulated.';
    return {
      ...entry,
      parts: forms.a.map((assetId) => ({ assetId, slot: 'HR' })),
      hairForms: forms,
      availability: 'preview',
      reason: warning,
      limitations: [...(entry.limitations ?? []), warning]
    };
  });
}
