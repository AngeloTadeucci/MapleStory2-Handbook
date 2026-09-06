import { describe, expect, it } from 'vitest';
import { SkinColors } from '../src/lib/outfits/skinColors';
import type { ColorControl, Rgb } from '../src/lib/outfits/materialColors';

const male: Rgb[] = [
  [1, 0.78431386, 0.69803923],
  [0, 1, 0],
  [0.9294119, 0.43529418, 0.34117648]
];
const garment: Rgb[] = [
  [0.7803923, 0.54901963, 0.4078432],
  [0, 1, 0],
  [0.56078434, 0.30588236, 0.20784317]
];
function part(label: string, defaults: Rgb[], shader = 'MS2CharacterSkinMaterial'): ColorControl {
  const colors = structuredClone(defaults);
  const setColors = (values: Rgb[]) => colors.splice(0, 3, ...structuredClone(values));
  return {
    label,
    shader,
    colors,
    setColors,
    set(index, color) {
      colors[index] = [...color];
    },
    reset() {
      setColors(defaults);
    },
    dispose() {}
  };
}

describe('character skin palette', () => {
  it('replaces the shirt arm defaults with the body palette without changing fabric dye', () => {
    const body = part('GL', male),
      arms = part('CL_Skin', garment),
      fabric = part('CL', garment, 'MS2CharacterMaterial');
    const skin = new SkinColors([body]);
    skin.attach([arms, fabric]);
    expect(arms.colors).toEqual(body.colors);
    expect(fabric.colors).toEqual(garment);
  });
  it('shares edits, equips into the current palette and resets every skin part to the body defaults', () => {
    const body = part('GL', male),
      head = part('HR', male),
      arms = part('CL_Skin', garment);
    const skin = new SkinColors([body, head]);
    skin.control!.set(0, [0.4, 0.5, 0.6]);
    skin.attach([arms]);
    expect(arms.colors).toEqual(body.colors);
    expect(head.colors).toEqual(body.colors);
    skin.control!.reset();
    for (const control of [body, head, arms]) expect(control.colors).toEqual(male);
    skin.detach([arms]);
    skin.control!.set(0, [0.1, 0.2, 0.3]);
    expect(arms.colors).toEqual(male);
  });
  it('rejects contradictory body defaults instead of choosing a palette arbitrarily', () => {
    expect(() => new SkinColors([part('GL', male), part('HR', garment)])).toThrow('disagree');
  });
});
