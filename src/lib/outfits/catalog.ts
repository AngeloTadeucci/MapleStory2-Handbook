import { z } from 'zod';
import { dev } from '$app/environment';
import getGltfUrl from '$lib/getGltfUrl';
import type { NativeAsset } from '$lib/nativeAssets';

export const slotNames: Record<string, string> = {
  HR: 'Hair',
  FA: 'Face',
  CP: 'Hats',
  CL: 'Tops',
  PA: 'Pants',
  GL: 'Gloves',
  SH: 'Shoes',
  MT: 'Back',
  EA: 'Earrings',
  OH: 'Off hand',
  RH: 'Right hand',
  LH: 'Left hand'
};
export const slotNumbers: Record<string, number> = {
  HR: 1,
  FA: 2,
  LH: 4,
  RH: 5,
  CP: 6,
  MT: 7,
  CL: 8,
  PA: 9,
  GL: 10,
  SH: 11,
  EA: 14,
  OH: 19
};
export const libraryBase = `${(dev ? '/gltf/' : getGltfUrl()).replace(/\/?$/, '/')}simulator-release-02/`;
export function characterPreviewBase(name: string): string {
  if (!dev || !/^[a-z0-9-]{1,40}$/.test(name)) throw new Error('Invalid local character preview');
  return `/gltf/character-previews/${name}/`;
}
export const libraryItemSchema = z.object({
  itemId: z.number().int().positive(),
  bodyVariant: z.enum(['male', 'female']),
  slots: z.array(z.string()).min(1),
  parts: z.array(z.object({ assetId: z.string(), slot: z.string() })).min(1),
  customize: z.record(z.string(), z.string()),
  cutting: z.array(z.string()),
  hairScales: z.array(z.array(z.number().min(0).max(1))).optional(),
  hairForms: z.record(z.string(), z.array(z.string())).optional(),
  hatHairForm: z.enum(['a', 'c', 'd']).optional(),
  availability: z.enum(['preview', 'verified', 'unavailable']),
  reason: z.string()
});
export const catalogSchema = z
  .object({
    version: z.literal(1),
    nativeManifestVersion: z.literal(1),
    items: z.array(libraryItemSchema)
  })
  .superRefine((catalog, ctx) => {
    const keys = new Set<string>();
    for (const item of catalog.items) {
      const key = `${item.itemId}-${item.bodyVariant}`;
      if (keys.has(key)) ctx.addIssue({ code: 'custom', message: `Duplicate item/body ${key}` });
      keys.add(key);
    }
  });
export type LibraryItem = z.infer<typeof libraryItemSchema>;
export type CatalogItem = {
  id: number;
  name: string;
  icon_path: string;
  gender: number;
  slot: number;
  is_outfit: number;
  dyeable: number;
  kfms: unknown;
  library: LibraryItem | null;
};
export type OutfitBundle = {
  item: CatalogItem;
  parts: NativeAsset[];
  slots: string[];
  hairForm?: string;
  forms?: Record<string, NativeAsset[]>;
};

export function resolveBundle(
  item: CatalogItem,
  assets: NativeAsset[],
  variant: string
): OutfitBundle {
  const library = item.library;
  if (!library || library.bodyVariant !== variant || library.availability === 'unavailable')
    throw new Error('This item is not available for the selected body');
  const parts = library.parts.map((part) => {
    const matches = assets.filter(
      (a) => a.id === part.assetId && a.bodyVariant === variant && a.slot === part.slot
    );
    if (matches.length !== 1) throw new Error(`Missing or ambiguous model part for ${item.name}`);
    return matches[0];
  });
  const forms: Record<string, NativeAsset[]> = {};
  for (const [form, ids] of Object.entries(library.hairForms ?? {})) {
    forms[form] = ids.map((id) => {
      const matches = assets.filter((a) => a.id === id && a.bodyVariant === variant);
      if (matches.length !== 1) throw new Error('Hair fitting model is unavailable');
      return { ...matches[0], attachment: parts[0].attachment };
    });
  }
  return {
    item,
    parts,
    slots: library.slots,
    ...(library.slots.includes('HR') ? { hairForm: 'a', forms: { a: parts, ...forms } } : {})
  };
}

export function fitHair(bundle: OutfitBundle, form: string): OutfitBundle {
  if (bundle.hairForm === form) return bundle;
  const parts = bundle.forms?.[form];
  if (!parts?.length)
    throw new Error(
      `${bundle.item.name} has no supported hair form for this hat. Remove the hat or choose another hairstyle.`
    );
  return { ...bundle, parts, hairForm: form };
}

export function conflictingItems(equipped: OutfitBundle[], next: OutfitBundle): OutfitBundle[] {
  return equipped.filter((old) => old.slots.some((slot) => next.slots.includes(slot)));
}

export const searchSchema = z.object({
  preview: z
    .string()
    .regex(/^[a-z0-9-]{0,40}$/)
    .default(''),
  search: z.string().max(100).default(''),
  body: z.enum(['male', 'female']).default('female'),
  slot: z
    .string()
    .refine((value) => value === '' || value === 'full' || value in slotNames)
    .default(''),
  availability: z.enum(['all', 'preview', 'verified']).default('verified'),
  outfit: z.enum(['all', 'true', 'false']).default('all'),
  page: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(12)
});
