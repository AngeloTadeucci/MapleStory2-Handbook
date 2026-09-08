import { describe, expect, it } from 'vitest';
import { Texture } from 'three';
import {
  bakeColors,
  prepareColorBake,
  editableTexture,
  type Pixels,
  type Rgb
} from '../src/lib/outfits/materialColors';

const mode = { linear: true, wrapS: false, wrapT: false };
const pixels = (width: number, ...data: number[]): Pixels => ({
  width,
  height: 1,
  data: new Uint8ClampedArray(data)
});
const colors: Rgb[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
describe('client color masks', () => {
  it('keeps the original texture source intact for initial rendering and reset', () => {
    const image = { width: 512, height: 256 };
    const original = new Texture(image);
    const canvas = { width: 300, height: 150 } as HTMLCanvasElement;
    const edited = editableTexture(original, canvas);
    expect(original.image).toBe(image);
    expect(edited.source).not.toBe(original.source);
    expect(edited.image).toBe(canvas);
    expect(edited.colorSpace).toBe(original.colorSpace);
  });
  it('retains mask resolution over a constant diffuse and preserves diffuse alpha', () => {
    const result = bakeColors(
      pixels(1, 255, 255, 255, 64),
      pixels(2, 255, 0, 0, 255, 0, 0, 0, 255),
      colors,
      mode,
      mode
    );
    expect(result.width).toBe(2);
    expect([...result.data]).toEqual([255, 0, 0, 64, 0, 0, 255, 64]);
  });
  it('uses green independently and alpha to mix with the original diffuse', () => {
    const result = bakeColors(
      pixels(1, 100, 120, 140, 200),
      pixels(1, 255, 255, 0, 128),
      colors,
      mode,
      mode
    );
    expect([...result.data]).toEqual([178, 188, 70, 200]);
  });
  it('keeps the original texture where control alpha is zero', () => {
    const original = pixels(2, 10, 20, 30, 40, 50, 60, 70, 80);
    expect(bakeColors(original, pixels(1, 255, 255, 255, 0), colors, mode, mode).data).toEqual(
      original.data
    );
  });
  it('honors nearest versus linear source sampling', () => {
    const source = pixels(2, 0, 0, 0, 255, 255, 255, 255, 255);
    const mask = pixels(4, ...Array(16).fill(0));
    expect(bakeColors(source, mask, colors, mode, mode).data[4]).toBe(64);
    expect(bakeColors(source, mask, colors, { ...mode, linear: false }, mode).data[4]).toBe(0);
  });
});

describe('prepared color changes', () => {
  it('matches the reference bake across sampling modes, dimensions, alpha and independent channels', () => {
    const image = (width: number, height: number, seed: number): Pixels => ({
      width,
      height,
      data: Uint8ClampedArray.from(
        { length: width * height * 4 },
        (_, i) => (i * 37 + seed * 19) % 256
      )
    });
    for (const [dw, dh, cw, ch] of [
      [1, 1, 8, 4],
      [8, 4, 1, 1],
      [4, 4, 4, 4],
      [3, 2, 7, 5],
      [7, 5, 3, 2]
    ]) {
      for (const linear of [false, true])
        for (const wrap of [false, true]) {
          const d = image(dw, dh, 3),
            c = image(cw, ch, 7);
          const mode = { linear, wrapS: wrap, wrapT: wrap };
          const prepared = prepareColorBake(d, c, mode, mode);
          for (const palette of [
            colors,
            [
              [0.13, 0.27, 0.96],
              [0.56, 0.83, 0.07],
              [0.95, 0.19, 0.62]
            ] as Rgb[]
          ]) {
            expect(prepared.bake(palette).data).toEqual(bakeColors(d, c, palette, mode, mode).data);
          }
        }
    }
  });
  it('reuses output memory and identifies only channels contributing to visible pixels', () => {
    const prepared = prepareColorBake(
      pixels(1, 255, 255, 255, 255),
      pixels(2, 128, 0, 0, 255, 0, 255, 0, 0),
      mode,
      mode
    );
    expect(prepared.activeChannels).toEqual([true, false, true]);
    const data = prepared.bake(colors).data;
    expect(prepared.bake([...colors].reverse()).data).toBe(data);
    expect(() => prepared.bake([[NaN, 0, 0], colors[1], colors[2]])).toThrow('finite');
    expect(
      prepareColorBake(pixels(1, 255, 255, 255, 0), pixels(1, 255, 255, 255, 255), mode, mode)
        .activeChannels
    ).toEqual([false, false, false]);
  });
});
