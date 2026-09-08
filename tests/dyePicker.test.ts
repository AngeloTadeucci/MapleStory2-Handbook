import { describe, it, expect, vi } from 'vitest';
import { applyDye, dyeChoices, matchesDye, hsvToRgb, rgbToHsv } from '../src/lib/outfits/dyePicker';
import { colorPalettes } from '../src/lib/colorPalette';
import type { ColorControl, Rgb } from '../src/lib/outfits/materialColors';
const current: Rgb[] = [
  [0.1, 0.2, 0.3],
  [0.4, 0.5, 0.6],
  [0.7, 0.8, 0.9]
];
const control = (shader = 'Hair'): ColorControl => ({
  label: shader === 'Skin' ? 'Skin' : 'Example',
  shader,
  colors: current,
  set: vi.fn(),
  setColors: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn()
});
describe('named dyes', () => {
  it('uses all Handbook dye names and draws two-tone choices', () => {
    const choices = dyeChoices(control());
    expect(choices).toHaveLength(colorPalettes.length);
    expect(choices[0].name).toBe("Griffin's Brown Feather");
    expect(choices.every((choice) => choice.name.length > 0)).toBe(true);
    expect(choices.at(-1)?.background).toContain('linear-gradient');
  });
  it('applies authored primary/shade while preserving the independent accent', () => {
    const choice = dyeChoices(control())[0],
      result = applyDye(choice, current);
    expect(result[0]).toEqual([127 / 255, 67 / 255, 65 / 255]);
    expect(result[2]).toEqual([91 / 255, 58 / 255, 58 / 255]);
    expect(result[1]).toEqual(current[1]);
    expect(result[1]).not.toBe(current[1]);
    expect(matchesDye(choice, result)).toBe(true);
    expect(matchesDye(choice, current)).toBe(false);
  });
  it('uses eye-specific dye channels and excludes achievement dyes for skin', () => {
    const choice = dyeChoices(control('Face'))[0];
    expect(applyDye(choice, current)[0]).toEqual([140 / 255, 76 / 255, 74 / 255]);
    expect(dyeChoices(control('Skin'))).toEqual([]);
  });
});
describe('custom color conversion', () => {
  it('round trips all RGB cube edges and representative interior colors', () => {
    const values = [0, 0.25, 0.5, 0.75, 1];
    for (const r of values)
      for (const g of values)
        for (const b of values) {
          const actual = hsvToRgb(rgbToHsv([r, g, b]));
          [r, g, b].forEach((v, index) => expect(actual[index]).toBeCloseTo(v, 10));
        }
  });
  it('handles hue wrapping, grayscale and bounded brightness', () => {
    expect(hsvToRgb({ h: 360, s: 1, v: 1 })).toEqual([1, 0, 0]);
    expect(hsvToRgb({ h: -120, s: 1, v: 1 })).toEqual([0, 0, 1]);
    expect(hsvToRgb({ h: 73, s: 0, v: 0.5 })).toEqual([0.5, 0.5, 0.5]);
    expect(hsvToRgb({ h: 0, s: 2, v: 2 })).toEqual([1, 0, 0]);
    expect(rgbToHsv([0, 0, 0])).toEqual({ h: 0, s: 0, v: 0 });
  });
});
