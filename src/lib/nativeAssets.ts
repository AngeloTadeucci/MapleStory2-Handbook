import { z } from 'zod';
import getGltfUrl from '$lib/getGltfUrl';
import { dev } from '$app/environment';

const relativeAssetPath = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !value.includes(':') &&
      !value.split('/').includes('..'),
    'Expected a relative asset path'
  );
const assetSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().nullish(),
  input: relativeAssetPath,
  uri: relativeAssetPath,
  clips: z.array(z.string()),
  skeleton: relativeAssetPath.nullish(),
  attach: z.string().nullish(),
  slot: z.string().nullish(),
  bodyVariant: z.string().nullish(),
  attachment: z
    .object({
      slot: z.string(),
      selfNode: z.string(),
      targetNode: z.string(),
      replace: z.boolean(),
      cutting: z.array(z.string())
    })
    .nullish()
});
const manifestSchema = z.object({
  version: z.literal(1),
  coordinateSystem: z.literal('gltf-y-up-meters'),
  assets: z.array(assetSchema)
});
export type NativeAsset = z.infer<typeof assetSchema> & { url: string };

export function parseNativeManifest(data: unknown, manifestUrl: string): NativeAsset[] {
  const manifest = manifestSchema.parse(data);
  return manifest.assets.map((asset) => ({ ...asset, url: new URL(asset.uri, manifestUrl).href }));
}

let manifestRequest: Promise<NativeAsset[]> | undefined;
export function loadNativeAssets(): Promise<NativeAsset[]> {
  manifestRequest ??= (async () => {
    const url = new URL(
      `${dev ? '/gltf/' : getGltfUrl()}native-manifest.json`,
      window.location.href
    ).href;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return [];
      return parseNativeManifest(await response.json(), url);
    } catch {
      return [];
    }
  })();
  return manifestRequest;
}

export async function findNativeAsset(id: string): Promise<NativeAsset | undefined> {
  return selectNativeAsset(await loadNativeAssets(), id);
}

export function selectNativeAsset(assets: NativeAsset[], id: string): NativeAsset | undefined {
  const matches = assets.filter((asset) => asset.id.toLowerCase() === id.toLowerCase());
  // Several body variants may share a source model. Never pick one by array order.
  return matches.length === 1 ? matches[0] : undefined;
}

export type ModelViewerElement = HTMLElement & {
  availableAnimations: string[];
  animationName: string;
  currentTime: number;
  duration: number;
  timeScale: number;
  play: () => void;
  pause: () => void;
  toDataURL: () => string;
};
