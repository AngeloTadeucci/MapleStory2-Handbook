import { expect, it, vi } from 'vitest';
import { sharedHairColor } from '../src/lib/outfits/hairColors';
import type { ColorControl, Rgb } from '../src/lib/outfits/materialColors';

function control(value: number): ColorControl {
  const colors: Rgb[] = [
    [value, 0, 0],
    [0, 1, 0],
    [0, 0, value]
  ];
  return {
    label: 'Hair',
    shader: 'Hair',
    colors,
    set(index, color) {
      colors[index] = [...color];
    },
    setColors(next) {
      colors.splice(0, colors.length, ...next.map((c): Rgb => [...c]));
    },
    reset: vi.fn(),
    dispose: vi.fn()
  };
}

it('shares base dye, edits, palette and reset with every ponytail', () => {
  const base = control(0.8),
    pony = control(0.2),
    second = control(0.3);
  const defaults = structuredClone(base.colors);
  const hair = sharedHairColor([base, pony, second]);
  expect(pony.colors).toEqual(defaults);
  hair.set(0, [0.1, 0.2, 0.3]);
  expect(hair.colors[0]).toEqual([0.1, 0.2, 0.3]);
  expect(pony.colors).toEqual(base.colors);
  expect(second.colors).toEqual(base.colors);
  hair.setColors([
    [1, 1, 1],
    [0, 0, 0],
    [0.5, 0.5, 0.5]
  ]);
  expect(second.colors).toEqual(base.colors);
  hair.reset();
  for (const part of [base, pony, second]) expect(part.colors).toEqual(defaults);
  hair.dispose();
  for (const part of [base, pony, second]) expect(part.dispose).toHaveBeenCalledOnce();
});

it('keeps an accent control when any hair attachment uses it', () => {
  const base = control(0.8),
    tail = control(0.8);
  base.activeChannels = [true, false, true];
  tail.activeChannels = [true, true, true];
  expect(sharedHairColor([base, tail]).activeChannels).toEqual([true, true, true]);
  tail.activeChannels = [true, false, true];
  expect(sharedHairColor([base, tail]).activeChannels).toEqual([true, false, true]);
});
