import { z } from 'zod';
import { dev } from '$app/environment';
import getGltfUrl from '$lib/getGltfUrl';
import type { NativeAsset } from '$lib/nativeAssets';
import { decalSchema } from './faceDecal';
import simulatorRelease from './simulator-release.json';

export const slotNames: Record<string, string> = {
  HR: 'Hair',
  FA: 'Face',
  FD: 'Makeup',
  CP: 'Hats',
  CL: 'Tops',
  PA: 'Pants',
  GL: 'Gloves',
  SH: 'Shoes',
  MT: 'Back',
  EA: 'Earrings',
  FH: 'Face accessories',
  EY: 'Eyewear',
  PD: 'Pendants',
  RI: 'Rings',
  BE: 'Belts',
  ER: 'Ears',
  BH: 'Both hands',
  RHLH: 'Both hands',
  OH: 'Either hand',
  RH: 'Right hand',
  LH: 'Left hand'
};
export const slotNumbers: Record<string, number> = {
  HR: 1,
  FA: 2,
  FD: 3,
  LH: 4,
  RH: 5,
  CP: 6,
  MT: 7,
  CL: 8,
  PA: 9,
  GL: 10,
  SH: 11,
  EA: 14,
  FH: 12,
  EY: 13,
  PD: 15,
  RI: 16,
  BE: 17,
  ER: 18,
  BH: 20,
  RHLH: 20,
  OH: 19
};
export const libraryBase = `${(dev ? '/gltf/' : getGltfUrl()).replace(/\/?$/, '/')}${simulatorRelease.directory}/`;
export function characterPreviewBase(name: string): string {
  if (!dev || !/^[a-z0-9-]{1,40}$/.test(name)) throw new Error('Invalid local character preview');
  return `/gltf/character-previews/${name}/`;
}
export const libraryItemSchema = z
  .object({
    itemId: z.number().int().positive(),
    sourceName: z.string().optional(),
    sourceIcon: z.string().nullable().optional(),
    isOutfit: z.number().int().optional(),
    classification: z.enum(['visual', 'nonvisual']).optional(),
    limitations: z.array(z.string()).optional(),
    bodyVariant: z.enum(['male', 'female']),
    slots: z.array(z.string()).min(1),
    parts: z.array(z.object({ assetId: z.string(), slot: z.string() })),
    decal: decalSchema.optional(),
    cosmeticEffect: z.literal('effects/hair-twinkle-a.json').optional(),
    handParts: z
      .object({ RH: z.array(z.string()).min(1), LH: z.array(z.string()).min(1) })
      .optional(),
    stowedParts: z.array(z.string()).min(1).optional(),
    customize: z.record(z.string(), z.string()),
    cutting: z.array(z.string()),
    // Client presets 10200008/10/12/38 include authored weights above one.
    hairScales: z.array(z.array(z.number().finite().min(0))).optional(),
    hairForms: z.record(z.string(), z.array(z.string())).optional(),
    hatHairForm: z.enum(['a', 'c', 'd']).optional(),
    availability: z.enum(['preview', 'verified', 'unavailable']),
    reason: z.string()
  })
  .refine(
    (item) =>
      item.availability === 'unavailable' ||
      item.parts.length > 0 ||
      (item.slots.length === 1 && item.slots[0] === 'FD' && item.decal),
    'Item requires geometry or a face decal'
  );
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
  hand?: 'RH' | 'LH';
  weaponPlacement?: 'drawn' | 'stowed';
  weaponForms?: { drawn: NativeAsset[]; stowed?: NativeAsset[] };
};

export function bundleKey(bundle: OutfitBundle): string {
  return `${bundle.item.id}${bundle.hand ? ':' + bundle.hand : ''}`;
}

export function resolveBundle(
  item: CatalogItem,
  assets: NativeAsset[],
  variant: string,
  hand?: 'RH' | 'LH'
): OutfitBundle {
  const library = item.library;
  if (!library || library.bodyVariant !== variant || library.availability === 'unavailable')
    throw new Error('This item is not available for the selected body');
  if (library.handParts) {
    const selected = hand ?? 'RH';
    const parts = library.handParts[selected].map((id) => {
      const matches = assets.filter(
        (a) => a.id === id && a.bodyVariant === variant && a.slot === selected
      );
      if (matches.length !== 1) throw new Error('Selected hand model is unavailable');
      return matches[0];
    });
    const stowed = library.stowedParts?.map((id) => {
      const matches = assets.filter(
        (a) => a.id === id && a.bodyVariant === variant && a.slot === 'OH'
      );
      if (matches.length !== 1) throw new Error('Stowed weapon model is unavailable');
      return matches[0];
    });
    return {
      item,
      parts,
      slots: [selected],
      hand: selected,
      weaponPlacement: 'drawn',
      weaponForms: { drawn: parts, stowed }
    };
  }
  if (hand) throw new Error('This item has no supported hand selection');
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
    // OH is an item category, not an extra equipment slot. Older single-model
    // entries occupy the default right hand until a left variant is exported.
    slots: library.slots.map((slot) => (slot === 'OH' ? 'RH' : slot)),
    ...(library.slots.includes('OH') ? { hand: 'RH' as const } : {}),
    ...(library.slots.includes('HR') ? { hairForm: 'a', forms: { a: parts, ...forms } } : {})
  };
}

export function placeWeapon(bundle: OutfitBundle, placement: 'drawn' | 'stowed'): OutfitBundle {
  const parts = bundle.weaponForms?.[placement];
  if (!parts?.length)
    throw new Error(`${bundle.item.name} has no supported ${placement} placement`);
  return { ...bundle, parts, weaponPlacement: placement };
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
  availability: z.enum(['all', 'preview', 'verified']).default('all'),
  outfit: z.enum(['all', 'true', 'false']).default('all'),
  page: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(12)
});
