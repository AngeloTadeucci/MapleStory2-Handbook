import type { ColorControl, Rgb } from './materialColors';

export const isSkinColor = (control: ColorControl): boolean =>
  control.shader === 'MS2CharacterSkinMaterial';
const copy = (colors: Rgb[]): Rgb[] => colors.map((color) => [...color]);

// Skin belongs to the dressed character. A garment's authored skin palette is
// only its standalone default, not an independent arm/neck customization.
export class SkinColors {
  readonly control?: ColorControl;
  private members = new Set<ColorControl>();

  constructor(body: ColorControl[]) {
    const skin = body.filter(isSkinColor);
    if (!skin.length) return;
    const defaults = copy(skin[0].colors);
    if (
      skin.some((part) =>
        part.colors.some((color, i) =>
          color.some((value, c) => Math.abs(value - defaults[i][c]) > 1e-6)
        )
      )
    ) {
      throw new Error('Body skin materials disagree on their default palette');
    }
    for (const part of skin) this.members.add(part);
    const colors = copy(defaults);
    const setColors = (values: Rgb[]) => {
      if (values.length !== 3) throw new Error('Three skin colors are required');
      colors.splice(0, 3, ...copy(values));
      for (const part of this.members) part.setColors(colors);
    };
    this.control = {
      label: 'Skin',
      shader: 'MS2CharacterSkinMaterial',
      colors,
      setColors,
      set(index, color) {
        if (index < 0 || index > 2) throw new Error('Invalid skin color channel');
        const values = copy(colors);
        values[index] = [...color];
        setColors(values);
      },
      reset() {
        setColors(defaults);
      },
      dispose() {
        /* Source controls own their textures. */
      }
    };
  }

  attach(controls: ColorControl[]) {
    const skin = controls.filter(isSkinColor);
    if (skin.length && !this.control)
      throw new Error('Body has no skin palette for this equipment');
    for (const part of skin) {
      part.setColors(this.control!.colors);
      this.members.add(part);
    }
  }

  detach(controls: ColorControl[]) {
    for (const part of controls) this.members.delete(part);
  }
}
