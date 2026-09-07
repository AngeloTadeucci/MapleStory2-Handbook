import { expect, it } from 'vitest';
import { decalSchema, decalUv } from '../src/lib/outfits/faceDecal';

it('maps saved Rosy Pink Blush coordinates using the client skin shader transform', () => {
  const transform: [number, number, number, number] = [0.25, 0.01, 0, 0.52];
  expect(decalUv(0.75, 0.51, transform)[0]).toBeCloseTo(0.5);
  expect(decalUv(0.75, 0.51, transform)[1]).toBeCloseTo(0.5);
  expect(decalUv(0.88, 0.51, transform)[0]).toBeCloseTo(1);
  expect(decalUv(0.75, 0.77, transform)[1]).toBeCloseTo(1);
  expect(decalUv(0.88, 0.51, [0.25, 0.01, Math.PI / 2, 0.52])[1]).toBeCloseTo(0);
});

it('rejects invalid decal scales and paths', () => {
  for (const texture of [
    '../secret.png',
    'https://example.com/a.png',
    'makeup/item_makeup/a/../../b.png'
  ])
    expect(decalSchema.safeParse({ texture, transform: [0, 0, 0, 1] }).success).toBe(false);
  expect(
    decalSchema.safeParse({ texture: 'makeup/item_makeup/blush.png', transform: [0, 0, 0, 0] })
      .success
  ).toBe(false);
});
