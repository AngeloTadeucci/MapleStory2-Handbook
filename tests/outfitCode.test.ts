import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import {
  decodeOutfit,
  encodeOutfit,
  resolveOutfit,
  MAX_CODE_LENGTH,
  type OutfitCode
} from '../src/lib/outfits/outfitCode';
import type { CatalogItem } from '../src/lib/outfits/catalog';
import type { NativeAsset } from '../src/lib/nativeAssets';
const code = (): OutfitCode => ({
  version: 1,
  body: 'female',
  bodyColors: [],
  items: [],
  expression: 'default',
  background: '',
  pose: 'fitting_idle_a',
  playing: true,
  effects: true,
  browserMotion: false
});
const raw = (value: unknown) =>
  'MS2O.' +
  btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
function fixture(id: number, slots: string[]) {
  const assets: NativeAsset[] = slots.map((slot) => ({
    id: `${id}-${slot}`,
    slot,
    bodyVariant: 'female',
    input: 'item.nif',
    skeleton: 'body.nif',
    uri: 'item.gltf',
    url: 'http://localhost/item.gltf',
    clips: []
  }));
  const item: CatalogItem = {
    id,
    name: `Item ${id}`,
    icon_path: '',
    gender: 1,
    slot: 8,
    is_outfit: 0,
    dyeable: 1,
    kfms: [],
    library: {
      itemId: id,
      bodyVariant: 'female',
      slots,
      parts: assets.map((a) => ({ slot: a.slot!, assetId: a.id })),
      customize: {},
      cutting: [],
      availability: 'preview',
      reason: ''
    }
  };
  return { item, assets };
}
describe('versioned outfit codes', () => {
  it('round trips appearance with independent tails and every dye channel exactly', () => {
    const input = code();
    input.browserMotion = true;
    input.background = 'ellinia_a';
    input.playing = false;
    input.items = [
      {
        id: 10200010,
        colors: [
          [
            [0.12345, 0.5, 1],
            [0, 0.22, 0.77],
            [1, 0.1, 0.2]
          ]
        ],
        hair: {
          lengths: [1, 0.37],
          tails: [
            { position: 2, scale: 0.8 },
            { position: 0, scale: 1.2 }
          ]
        },
        animations: ['idle']
      }
    ];
    const encoded = encodeOutfit(input);
    expect(encoded).toMatch(/^MS2O\.[A-Za-z0-9_-]+$/);
    expect(decodeOutfit(encoded)).toEqual(input);
  });
  it.each([
    '',
    'MS2O.A',
    'MS2O.ab$',
    '<script>alert(1)</script>',
    'MS2O.e30',
    'x'.repeat(MAX_CODE_LENGTH + 1)
  ])('rejects malformed, truncated or oversized text', (text) =>
    expect(() => decodeOutfit(text)).toThrow()
  );
  it('rejects unknown versions, keys, unsafe numbers, oversized decoded JSON and invalid customization', () => {
    for (const input of [
      { ...code(), version: 2 },
      { ...code(), player: 'private' },
      { ...code(), items: [{ id: -1, colors: [], animations: [] }] },
      { ...code(), background: '../secret' },
      { ...code(), pose: 'x'.repeat(33000) },
      {
        ...code(),
        items: [
          {
            id: 1,
            colors: [
              [
                [2, 0, 0],
                [0, 0, 0],
                [0, 0, 0]
              ]
            ],
            animations: []
          }
        ]
      }
    ])
      expect(() => decodeOutfit(raw(input))).toThrow();
    expect(() =>
      encodeOutfit({
        ...code(),
        items: [{ id: 1, colors: [], animations: [], hair: { lengths: [NaN, 0], tails: [] } }]
      })
    ).toThrow();
  });
  it('rejects missing, unavailable and wrong-body items', () => {
    const input = code();
    input.items = [{ id: 1, colors: [], animations: [] }];
    const f = fixture(1, ['CL']);
    expect(() => resolveOutfit(input, [], f.assets)).toThrow('missing');
    f.item.library!.availability = 'unavailable';
    expect(() => resolveOutfit(input, [f.item], f.assets)).toThrow('unavailable');
    f.item.library!.bodyVariant = 'male';
    expect(() => resolveOutfit(input, [f.item], f.assets)).toThrow('incompatible');
  });
  it('keeps a full outfit in both slots and rejects a duplicate or conflicting garment', () => {
    const dress = fixture(1, ['CL', 'PA']),
      pants = fixture(2, ['PA']);
    const input = code();
    input.items = [{ id: 1, colors: [], animations: [] }];
    const items = [dress.item, pants.item],
      assets = [...dress.assets, ...pants.assets];
    expect(resolveOutfit(input, items, assets)[0].slots).toEqual(['CL', 'PA']);
    input.items.push({ id: 2, colors: [], animations: [] });
    expect(() => resolveOutfit(input, items, assets)).toThrow('Conflicting');
    input.items[1].id = 1;
    expect(() => resolveOutfit(input, items, assets)).toThrow('Duplicate');
  });
  it('restores explicit hands separately, rejects invalid hand choice and incompatible hat forms', () => {
    const star = fixture(1, ['OH']);
    star.item.library!.handParts = { LH: ['left'], RH: ['right'] };
    const assets = [
      { ...star.assets[0], id: 'left', slot: 'LH' },
      { ...star.assets[0], id: 'right', slot: 'RH' }
    ];
    const input = code();
    input.items = [
      { id: 1, hand: 'LH', colors: [], animations: [] },
      { id: 1, hand: 'RH', colors: [], animations: [] }
    ];
    expect(resolveOutfit(input, [star.item], assets).map((b) => b.slots)).toEqual([['LH'], ['RH']]);
    delete input.items[0].hand;
    expect(() => resolveOutfit(input, [star.item], assets)).toThrow('explicit hand');
    const hair = fixture(2, ['HR']),
      hat = fixture(3, ['CP']);
    hat.item.library!.hatHairForm = 'c';
    input.items = [
      { id: 2, colors: [], animations: [] },
      { id: 3, colors: [], animations: [] }
    ];
    expect(() =>
      resolveOutfit(input, [hair.item, hat.item], [...hair.assets, ...hat.assets])
    ).toThrow('hair form');
  });
});

it('round trips continuous hair positions and custom makeup transforms with bounds', () => {
  const input = code();
  input.items = [
    {
      id: 10200070,
      colors: [],
      animations: [],
      hair: { lengths: [null, null], tails: [{ position: 0.625, scale: 1 }] }
    },
    {
      id: 10400011,
      colors: [],
      animations: [],
      makeup: { position: 0, scale: 0.12, offset: [0.22, -0.03], rotation: 0.4 }
    }
  ];
  expect(decodeOutfit(encodeOutfit(input))).toEqual(input);
  for (const makeup of [
    { position: 0, scale: 0.12, offset: [0.51, 0] },
    { position: 0, scale: 0.12, rotation: 4 }
  ]) {
    expect(() =>
      decodeOutfit(raw({ ...input, items: [{ id: 10400011, colors: [], animations: [], makeup }] }))
    ).toThrow();
  }
});

it('exports the same code regardless of equip order without mutating the input', () => {
  const input = code();
  input.items = [
    { id: 10400011, colors: [], animations: [] },
    { id: 10200010, colors: [], animations: [] }
  ];
  const original = structuredClone(input);
  expect(encodeOutfit(input)).toBe(encodeOutfit({ ...input, items: [...input.items].reverse() }));
  expect(input).toEqual(original);
});
