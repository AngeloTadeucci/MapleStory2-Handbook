import {
  DataTexture,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType
} from 'three';
import { z } from 'zod';
import { prepareColorBake, type ColorControl, type Pixels, type Rgb } from './materialColors';
import { sourceName } from './sharedSkeleton';
import { libraryBase } from './catalog';

const rgb = z.tuple([z.number(), z.number(), z.number()]);
const frameSchema = z.object({
  image: z.string(),
  mask: z.string().nullable(),
  duration: z.number().positive()
});
const sequenceSchema = z.object({
  frames: z.array(frameSchema).min(1),
  repeat: z.boolean(),
  sourceAnimation: z.string().nullable()
});
export const customizationSchema = z.object({
  version: z.literal(1),
  palettes: z.record(
    z.string(),
    z.array(z.object({ id: z.string(), swatch: z.string(), colors: z.array(rgb).length(3) }))
  ),
  faces: z.record(
    z.string(),
    z.object({ code: z.string(), sequences: z.record(z.string(), sequenceSchema) })
  )
});
export type Customization = z.infer<typeof customizationSchema>;
export type FacePreset = Customization['faces'][string];
export function frameAt(durations: number[], elapsedMs: number, repeat: boolean): number {
  if (
    !durations.length ||
    durations.some((duration) => !Number.isFinite(duration) || duration <= 0)
  )
    throw new Error('Invalid face timing');
  const total = durations.reduce((a, b) => a + b, 0);
  let time = Math.max(0, elapsedMs);
  if (repeat) time %= total;
  for (const [index, duration] of durations.entries()) {
    if (time < duration) return index;
    time -= duration;
  }
  return durations.length - 1;
}
const rawSchema = z.object({
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  rgba: z.string()
});
async function pixels(path: string, base: string): Promise<Pixels> {
  if (!/^item_face\/[a-z0-9_/.]+\.json$/.test(path) || path.includes('..'))
    throw new Error('Invalid face texture path');
  const response = await fetch(`${base}faces/${path}`);
  if (!response.ok) throw new Error('Face texture is unavailable');
  const data = rawSchema.parse(await response.json());
  const bytes = Uint8ClampedArray.from(atob(data.rgba), (c) => c.charCodeAt(0));
  if (bytes.length !== data.width * data.height * 4) throw new Error('Invalid face pixel count');
  return { width: data.width, height: data.height, data: bytes };
}

export class FaceAnimation {
  private originals = new Map<MeshStandardMaterial, Texture | null>();
  private images = new Map<
    string,
    {
      image: Pixels;
      bake?: ReturnType<typeof prepareColorBake>;
      texture: DataTexture;
      data: Uint8Array;
    }
  >();
  private expression = 'default';
  private elapsed = 0;
  readonly control: ColorControl;
  private constructor(
    private preset: FacePreset,
    defaults: Rgb[]
  ) {
    const colors = defaults.map((c): Rgb => [...c]);
    this.control = {
      label: 'Eyes',
      shader: 'Face',
      colors,
      set: (index, value) => {
        colors[index] = [...value];
        this.recolor();
      },
      setColors: (values) => {
        colors.splice(0, 3, ...values.map((v): Rgb => [...v]));
        this.recolor();
      },
      reset: () => {
        colors.splice(0, 3, ...defaults.map((v): Rgb => [...v]));
        this.recolor();
      },
      dispose: () => this.dispose()
    };
  }
  static async load(
    preset: FacePreset,
    defaults: Rgb[],
    base = libraryBase
  ): Promise<FaceAnimation> {
    const face = new FaceAnimation(preset, defaults);
    try {
      for (const frame of Object.values(preset.sequences).flatMap((s) => s.frames)) {
        const key = frame.image + '|' + frame.mask;
        if (face.images.has(key)) continue;
        const image = await pixels(frame.image, base),
          mask = frame.mask ? await pixels(frame.mask, base) : undefined;
        const mode = { linear: true, wrapS: false, wrapT: false };
        const bake = mask ? prepareColorBake(image, mask, mode, mode) : undefined;
        const output = bake?.pixels ?? image;
        const data = new Uint8Array(output.data);
        const texture = new DataTexture(
          data,
          output.width,
          output.height,
          RGBAFormat,
          UnsignedByteType
        );
        texture.colorSpace = SRGBColorSpace;
        texture.flipY = false;
        texture.magFilter = LinearFilter;
        texture.minFilter = LinearFilter;
        face.images.set(key, { image, bake, texture, data });
      }
      face.control.activeChannels = [0, 1, 2].map((index) =>
        [...face.images.values()].some((frame) => frame.bake?.activeChannels[index] === true)
      );
      face.recolor();
      return face;
    } catch (error) {
      face.dispose();
      throw error;
    }
  }
  attach(root: Object3D) {
    root.traverse((node) => {
      if (!(node instanceof Mesh) || sourceName(node) !== 'FA') return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        if (material instanceof MeshStandardMaterial) this.originals.set(material, material.map);
    });
    if (!this.originals.size) throw new Error('Face mesh is missing');
    this.update(0);
  }
  select(name: string) {
    if (!this.preset.sequences[name]) throw new Error('Expression unavailable');
    this.expression = name;
    this.elapsed = 0;
    this.update(0);
  }
  update(delta: number) {
    this.elapsed += delta * 1000;
    const sequence = this.preset.sequences[this.expression];
    const frame =
      sequence.frames[
        frameAt(
          sequence.frames.map((f) => f.duration),
          this.elapsed,
          sequence.repeat
        )
      ];
    const texture = this.images.get(frame.image + '|' + frame.mask)!.texture;
    for (const material of this.originals.keys()) material.map = texture;
  }
  private recolor() {
    for (const { image, bake, texture, data } of this.images.values()) {
      const result = bake ? bake.bake(this.control.colors) : image;
      data.set(result.data);
      texture.needsUpdate = true;
    }
  }
  dispose() {
    for (const [material, original] of this.originals) material.map = original;
    this.originals.clear();
    for (const { texture } of this.images.values()) texture.dispose();
    this.images.clear();
  }
}
