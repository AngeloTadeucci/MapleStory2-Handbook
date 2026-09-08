import { colorPalettes } from '$lib/colorPalette';
import { getColorPaletteName } from '$lib/colorPaletteName';
import type { Customization } from './faceAnimation';
import type { ColorControl, Rgb } from './materialColors';

export type DyeChoice = {
  id: string;
  name: string;
  background: string;
  colors: Array<Rgb | null>;
};
export const rgbHex = (rgb: Rgb) =>
  '#' +
  rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
const packedRgb = (value: number): Rgb =>
  [16, 8, 0].map((shift) => ((value >>> shift) & 255) / 255) as Rgb;
// The exported base palette's swatches identify names, not its palette-local row IDs.
const basicSwatches = [
  '#b3261c',
  '#f0932c',
  '#f6cf34',
  '#4e774d',
  '#496fc4',
  '#3a436c',
  '#7650b5',
  '#e4768b',
  '#62321c',
  '#151515',
  '#97432c',
  '#f3bd73',
  '#fde7b6',
  '#cfd95e',
  '#87dbf0',
  '#84adff',
  '#b7a5f1',
  '#ffa8cb',
  '#a3a3a3',
  '#f8f8f8'
];
export function dyeChoices(control: ColorControl, customization?: Customization): DyeChoice[] {
  const skin = control.label === 'Skin';
  const paletteId =
    control.paletteId ??
    (control.shader === 'Face' ? '3' : skin ? '1' : control.shader.includes('Hair') ? '2' : '10');
  const basic = (customization?.palettes[paletteId] ?? []).map((choice, index) => {
    const nameIndex = basicSwatches.indexOf(choice.swatch.toLowerCase());
    return {
      id: `basic:${choice.id}`,
      name: skin
        ? `Skin tone ${index + 1}`
        : nameIndex >= 0
          ? getColorPaletteName(10000001 + nameIndex)
          : `Color ${index + 1}`,
      background: choice.swatch,
      colors: choice.colors
    };
  });
  if (skin) return basic;
  return [
    ...basic,
    ...colorPalettes.map((dye) => {
      const primary = packedRgb(control.shader === 'Face' ? dye.ch0_eye : dye.ch0);
      const shade = packedRgb(control.shader === 'Face' ? dye.ch2_eye : dye.ch2);
      return {
        id: `dye:${dye.colorSN}`,
        name: getColorPaletteName(dye.stringKey),
        background: dye.show2color
          ? `linear-gradient(135deg, ${rgbHex(packedRgb(dye.ch0))} 50%, ${rgbHex(packedRgb(dye.ch2))} 50%)`
          : rgbHex(packedRgb(dye.palette ?? dye.ch0)),
        // Achievement dyes author primary and shade only. Preserve the accent channel.
        colors: [primary, null, shade]
      };
    })
  ];
}
export function applyDye(choice: DyeChoice, current: Rgb[]): Rgb[] {
  return current.map((color, index) => [...(choice.colors[index] ?? color)] as Rgb);
}
export function matchesDye(choice: DyeChoice, current: Rgb[]): boolean {
  return choice.colors.every(
    (color, index) =>
      color === null || color.every((v, n) => Math.abs(v - (current[index]?.[n] ?? -1)) < 1e-6)
  );
}
export type Hsv = { h: number; s: number; v: number };
export function rgbToHsv([r, g, b]: Rgb): Hsv {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  let h =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}
export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const rgb =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return rgb.map((n) => n + m) as Rgb;
}
