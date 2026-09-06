import type { NativeAsset } from '$lib/nativeAssets';

export function hidesBodyPart(name: string, assets: Iterable<NativeAsset>): boolean {
  for (const asset of assets) {
    const attachment = asset.attachment;
    if (attachment?.cutting.includes(name)) return true;
    if (!attachment?.replace) continue;
    if (name === attachment.targetNode) return true;
    // The naked body's CL_Skin/CL_Bra and the garment's CL/CL_Skin are
    // sibling meshes. Replacing the clothing slot must also replace its parts.
    if (
      ['CL', 'PA', 'SH'].includes(attachment.targetNode) &&
      name.startsWith(attachment.targetNode + '_')
    )
      return true;
  }
  return false;
}
