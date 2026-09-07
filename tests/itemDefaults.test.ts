import { expect, it, vi } from 'vitest';
import { applyItemDefault, itemDefaultColors } from '../src/lib/outfits/itemDefaults';
import type { ColorControl, Rgb } from '../src/lib/outfits/materialColors';

it('selects the declared colorSN and resets item dyes without mutating the shared palette', () => {
  const colors: Rgb[] = [
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
    [0.7, 0.8, 0.9]
  ];
  const palettes = { '10': [{ id: '9', swatch: '#123456', colors }] };
  const defaults = itemDefaultColors({ colorPalette: '10', defaultColorIndex: '9' }, palettes)!;
  const control: ColorControl = {
    label: '',
    shader: '',
    colors: [],
    set: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
    setColors: (values) => {
      control.colors = values;
    }
  };
  applyItemDefault(control, defaults);
  control.colors[0][0] = 1;
  control.reset();
  expect(control.colors).toEqual(colors);
  expect(colors[0][0]).toBe(0.1);
  expect(itemDefaultColors({}, palettes)).toBeUndefined();
  expect(() =>
    itemDefaultColors({ colorPalette: '10', defaultColorIndex: '19,0' }, palettes)
  ).toThrow('Animated');
  expect(() => itemDefaultColors({ colorPalette: '10', defaultColorIndex: '8' }, palettes)).toThrow(
    'unavailable'
  );
});

it('plays source colorDelay boundaries, preserves an explicit dye and restores playback on reset', async () => {
  const { ItemPaletteAnimation } = await import('../src/lib/outfits/itemDefaults');
  const red: Rgb[] = [
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0]
    ],
    blue: Rgb[] = [
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1]
    ];
  const control: ColorControl = {
    label: '',
    shader: '',
    colors: [],
    set: (i, c) => {
      control.colors[i] = c;
    },
    setColors: (c) => {
      control.colors = c;
    },
    reset: vi.fn(),
    dispose: vi.fn()
  };
  const animation = new ItemPaletteAnimation(
    control,
    { colorPalette: '10', defaultColorIndex: '19,0', colorDelay: '500,500' },
    {
      '10': [
        { id: '19', swatch: '#ff0000', colors: red },
        { id: '0', swatch: '#0000ff', colors: blue }
      ]
    }
  );
  expect(control.colors).toEqual(red);
  animation.seek(0.499);
  expect(control.colors).toEqual(red);
  animation.seek(0.5);
  expect(control.colors).toEqual(blue);
  animation.seek(1);
  expect(control.colors).toEqual(red);
  control.setColors(blue);
  animation.seek(4);
  expect(control.colors).toEqual(blue);
  control.reset();
  expect(control.colors).toEqual(red);
  animation.update(0.5);
  expect(control.colors).toEqual(blue);
});
