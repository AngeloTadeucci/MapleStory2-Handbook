import type { Customization } from './faceAnimation';
import type { ColorControl, Rgb } from './materialColors';

export function itemDefaultColors(
  customize: Record<string, string>,
  palettes: Customization['palettes']
): Rgb[] | undefined {
  const index = customize.defaultColorIndex;
  if (index === undefined) return;
  if (!/^\d+$/.test(index)) throw new Error('Animated default palette selection is not supported');
  const color = palettes[customize.colorPalette]?.find((entry) => entry.id === index);
  if (!color) throw new Error('The source default dye palette is unavailable');
  return color.colors.map((channel) => [...channel]);
}

export function applyItemDefault(control: ColorControl, colors: Rgb[]) {
  const defaults = colors.map((channel): Rgb => [...channel]);
  control.setColors(defaults.map((channel) => [...channel]));
  control.reset = () => control.setColors(defaults.map((channel) => [...channel]));
}

export class ItemPaletteAnimation {
  private time = 0;
  private active = true;
  private frame = -1;
  private colors: Rgb[][];
  private durations: number[];
  private apply: ColorControl['setColors'];
  constructor(
    control: ColorControl,
    customize: Record<string, string>,
    palettes: Customization['palettes']
  ) {
    const indices = customize.defaultColorIndex.split(',');
    this.durations = (customize.colorDelay ?? '').split(',').map(Number);
    if (
      indices.length !== this.durations.length ||
      this.durations.some((value) => !Number.isFinite(value) || value <= 0)
    )
      throw new Error('Invalid source palette animation delays');
    this.colors = indices.map(
      (index) => itemDefaultColors({ ...customize, defaultColorIndex: index }, palettes)!
    );
    this.apply = control.setColors.bind(control);
    const set = control.set.bind(control);
    // A user dye replaces default playback. Reset restores the authored cycle.
    control.set = (index, color) => {
      this.active = false;
      set(index, color);
    };
    control.setColors = (colors) => {
      this.active = false;
      this.apply(colors);
    };
    control.reset = () => {
      this.active = true;
      this.frame = -1;
      this.seek(0);
    };
    this.seek(0);
  }
  update(seconds: number) {
    this.seek(this.time + seconds);
  }
  seek(seconds: number) {
    this.time = Math.max(0, seconds);
    if (!this.active) return;
    let time = (this.time * 1000) % this.durations.reduce((sum, value) => sum + value, 0);
    let frame = 0;
    while (frame < this.durations.length - 1 && time >= this.durations[frame])
      time -= this.durations[frame++];
    if (frame === this.frame) return;
    this.frame = frame;
    this.apply(this.colors[frame].map((color) => [...color]));
  }
}
