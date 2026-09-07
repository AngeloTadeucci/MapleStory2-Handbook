import type { ColorControl, Rgb } from './materialColors';

// A hairstyle's base and ponytail share one dye selection in the client.
export function sharedHairColor(controls: ColorControl[]): ColorControl {
  const first = controls[0];
  if (!first) throw new Error('Hair needs at least one color control');
  const defaults = first.colors.map((color): Rgb => [...color]);
  const setColors = (colors: Rgb[]) => {
    const copy = colors.map((color): Rgb => [...color]);
    for (const control of controls) control.setColors(copy);
  };
  setColors(defaults);
  return {
    ...first,
    set(index, color) {
      for (const control of controls) control.set(index, color);
    },
    setColors,
    reset: () => setColors(defaults),
    dispose() {
      for (const control of controls) control.dispose();
    }
  };
}
