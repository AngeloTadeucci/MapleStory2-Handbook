import { z } from 'zod';
import { bundleKey, fitHair, placeWeapon, resolveBundle, type CatalogItem } from './catalog';
import type { NativeAsset } from '$lib/nativeAssets';

export const MAX_CODE_LENGTH = 48_000;
const MAX_JSON_BYTES = 32_000;
const rgb = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]);
const channels = z.array(rgb).length(3);
const hair = z
  .object({
    lengths: z.array(z.number().min(0).max(3).nullable()).length(2),
    tails: z
      .array(
        z.object({ position: z.number().min(0).max(15), scale: z.number().min(0).max(3) }).strict()
      )
      .max(4)
  })
  .strict();
export const outfitCodeSchema = z
  .object({
    version: z.literal(1),
    body: z.enum(['female', 'male']),
    bodyColors: z.array(channels).max(2),
    items: z
      .array(
        z
          .object({
            id: z.number().int().positive().max(2147483647),
            hand: z.enum(['LH', 'RH']).optional(),
            placement: z.enum(['drawn', 'stowed']).optional(),
            colors: z.array(channels).max(32),
            hair: hair.optional(),
            makeup: z
              .object({
                position: z.number().int().min(0).max(31),
                offset: z
                  .tuple([z.number().min(-0.5).max(0.5), z.number().min(-0.5).max(0.5)])
                  .optional(),
                rotation: z.number().min(-Math.PI).max(Math.PI).optional(),
                scale: z.number().positive().max(10)
              })
              .strict()
              .optional(),
            animations: z.array(z.string().min(1).max(100)).max(16)
          })
          .strict()
      )
      .max(20),
    expression: z.string().min(1).max(60),
    background: z.enum(['', 'blue', 'henesys_a', 'ellinia_a']),
    pose: z.string().min(1).max(100),
    playing: z.boolean(),
    effects: z.boolean(),
    browserMotion: z.boolean()
  })
  .strict();
export type OutfitCode = z.infer<typeof outfitCodeSchema>;

export function encodeOutfit(value: OutfitCode): string {
  const parsed = outfitCodeSchema.parse(value);
  parsed.items.sort((a, b) => a.id - b.id || (a.hand ?? '').localeCompare(b.hand ?? ''));
  const json = JSON.stringify(parsed);
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > MAX_JSON_BYTES) throw new Error('This outfit code is too large.');
  return (
    'MS2O.' +
    btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '')
  );
}
export function decodeOutfit(input: string): OutfitCode {
  if (input.length > MAX_CODE_LENGTH) throw new Error('Outfit code exceeds the size limit.');
  const code = input.trim();
  if (!/^MS2O\.[A-Za-z0-9_-]+$/.test(code)) throw new Error('Paste a complete MS2O outfit code.');
  const payload = code.slice(5);
  if (payload.length % 4 === 1) throw new Error('Outfit code is truncated.');
  try {
    const raw = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    if (raw.length > MAX_JSON_BYTES) throw new Error('Outfit code exceeds the size limit.');
    const parsed: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, (c) => c.charCodeAt(0)))
    );
    return outfitCodeSchema.parse(parsed);
  } catch {
    throw new Error(
      'Invalid outfit code, unsupported version, or values outside the allowed limits.'
    );
  }
}

// Resolve exact catalog identities and all conflicts before touching a scene.
export function resolveOutfit(code: OutfitCode, items: CatalogItem[], assets: NativeAsset[]) {
  const used = new Set<string>();
  const keys = new Set<string>();
  const bundles = code.items.map((saved) => {
    const item = items.find((i) => i.id === saved.id && i.library?.bodyVariant === code.body);
    if (!item)
      throw new Error(`Item ${saved.id} is missing or incompatible with the ${code.body} body.`);
    if (item.library?.availability === 'unavailable')
      throw new Error(`${item.name} is unavailable: ${item.library.reason}`);
    let bundle = resolveBundle(
      item,
      assets,
      code.body,
      item.library?.handParts ? saved.hand : undefined
    );
    if (bundle.hand !== saved.hand)
      throw new Error(`${item.name} requires an explicit hand selection.`);
    if (saved.placement) bundle = placeWeapon(bundle, saved.placement);
    if (saved.hair && !bundle.slots.includes('HR'))
      throw new Error('Hair controls belong to a hairstyle.');
    if (saved.makeup && !bundle.slots.includes('FD'))
      throw new Error('Makeup controls belong to makeup.');
    const key = bundleKey(bundle);
    if (keys.has(key)) throw new Error(`Duplicate item: ${item.name}.`);
    keys.add(key);
    for (const slot of bundle.slots.flatMap((s) =>
      ['BH', 'RHLH'].includes(s) ? ['LH', 'RH'] : [s]
    )) {
      if (used.has(slot)) throw new Error(`Conflicting items occupy the ${slot} slot.`);
      used.add(slot);
    }
    return bundle;
  });
  const form = bundles.find((b) => b.slots.includes('CP'))?.item.library?.hatHairForm ?? 'a';
  return bundles.map((b) => (b.slots.includes('HR') ? fitHair(b, form) : b));
}
