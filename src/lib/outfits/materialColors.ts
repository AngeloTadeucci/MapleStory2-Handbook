import { Mesh, MeshStandardMaterial, NearestFilter, RepeatWrapping, Source, Texture } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { z } from 'zod';

export type Rgb = [number, number, number];
export type Pixels = { width: number; height: number; data: Uint8ClampedArray };
export type Sampling = { linear: boolean; wrapS: boolean; wrapT: boolean };
const textureInfo = z.object({
  index: z.number().int().nonnegative(),
  texCoord: z.number().int().optional()
});
const metadata = z.object({
  nifShader: z.string(),
  nifOverrideColors: z.array(z.tuple([z.number(), z.number(), z.number()])).length(3),
  nifBaseColorTexture: textureInfo,
  nifColorControlTexture: textureInfo
});

function sample(image: Pixels, u: number, v: number, mode: Sampling): number[] {
  const index = (n: number, size: number, wrap: boolean) =>
    wrap ? ((n % size) + size) % size : Math.max(0, Math.min(size - 1, n));
  const at = (x: number, y: number, channel: number) =>
    image.data[
      (index(y, image.height, mode.wrapT) * image.width + index(x, image.width, mode.wrapS)) * 4 +
        channel
    ] / 255;
  const px = u * image.width - 0.5,
    py = v * image.height - 0.5;
  const x = Math.floor(px),
    y = Math.floor(py),
    fx = px - x,
    fy = py - y;
  return [0, 1, 2, 3].map((c) =>
    mode.linear
      ? (at(x, y, c) * (1 - fx) + at(x + 1, y, c) * fx) * (1 - fy) +
        (at(x, y + 1, c) * (1 - fx) + at(x + 1, y + 1, c) * fx) * fy
      : at(Math.floor(u * image.width), Math.floor(v * image.height), c)
  );
}

// Matches the client's ColorOverride fragment and the converter's default bake.
// Work in source texture values, then let the glTF base-color map handle sRGB.
export function bakeColors(
  diffuse: Pixels,
  control: Pixels,
  colors: Rgb[],
  diffuseMode: Sampling,
  controlMode: Sampling
): Pixels {
  if (colors.length !== 3 || colors.some((color) => color.some((value) => !Number.isFinite(value))))
    throw new Error('Three finite override colors are required');
  const width = Math.max(diffuse.width, control.width),
    height = Math.max(diffuse.height, control.height);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const u = (((i / 4) % width) + 0.5) / width,
      v = (Math.floor(i / 4 / width) + 0.5) / height;
    const d = sample(diffuse, u, v, diffuseMode),
      c = sample(control, u, v, controlMode);
    for (let channel = 0; channel < 3; channel++) {
      const override =
        colors[0][channel] * c[0] + colors[1][channel] * c[1] + colors[2][channel] * (1 - c[0]);
      data[i + channel] = Math.round((d[channel] * (1 - c[3]) + override * c[3]) * 255);
    }
    data[i + 3] = Math.round(d[3] * 255);
  }
  return { width, height, data };
}

/** Cache source sampling once. Slider updates only blend fixed samples into reusable pixels. */
export function prepareColorBake(
  diffuse: Pixels,
  control: Pixels,
  diffuseMode: Sampling,
  controlMode: Sampling
) {
  const width = Math.max(diffuse.width, control.width),
    height = Math.max(diffuse.height, control.height);
  const sampled = (image: Pixels, mode: Sampling) => {
    if (
      (image.width === width && image.height === height) ||
      (image.width === 1 && image.height === 1)
    )
      return { data: image.data, divisor: 255, constant: image.width === 1 && image.height === 1 };
    const data = new Float64Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      const u = (((i / 4) % width) + 0.5) / width,
        v = (Math.floor(i / 4 / width) + 0.5) / height;
      data.set(sample(image, u, v, mode), i);
    }
    return { data, divisor: 1, constant: false };
  };
  const d = sampled(diffuse, diffuseMode),
    c = sampled(control, controlMode);
  const pixels: Pixels = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const activeChannels: [boolean, boolean, boolean] = [false, false, false];
  for (let i = 0; i < pixels.data.length; i += 4) {
    const di = d.constant ? 0 : i,
      ci = c.constant ? 0 : i;
    if (d.data[di + 3] === 0 || c.data[ci + 3] === 0) continue;
    if (c.data[ci] > 0) activeChannels[0] = true;
    if (c.data[ci + 1] > 0) activeChannels[1] = true;
    if (c.data[ci] < c.divisor) activeChannels[2] = true;
  }
  return {
    pixels,
    activeChannels,
    bake(colors: Rgb[]): Pixels {
      if (
        colors.length !== 3 ||
        colors.some((color) => color.some((value) => !Number.isFinite(value)))
      )
        throw new Error('Three finite override colors are required');
      const [primary, accent, shade] = colors;
      const output = pixels.data;
      for (let i = 0; i < output.length; i += 4) {
        const di = d.constant ? 0 : i,
          ci = c.constant ? 0 : i;
        const red = c.data[ci] / c.divisor,
          green = c.data[ci + 1] / c.divisor,
          alpha = c.data[ci + 3] / c.divisor;
        for (let channel = 0; channel < 3; channel++) {
          const override =
            primary[channel] * red + accent[channel] * green + shade[channel] * (1 - red);
          output[i + channel] = Math.round(
            ((d.data[di + channel] / d.divisor) * (1 - alpha) + override * alpha) * 255
          );
        }
        output[i + 3] = Math.round((d.data[di + 3] / d.divisor) * 255);
      }
      return pixels;
    }
  };
}

export type ColorControl = {
  label: string;
  shader: string;
  paletteId?: string;
  colors: Rgb[];
  activeChannels?: readonly boolean[];
  set: (index: number, color: Rgb) => void;
  setColors: (colors: Rgb[]) => void;
  reset: () => void;
  dispose: () => void;
};

export function editableTexture(original: Texture, image: HTMLCanvasElement): Texture {
  const edited = original.clone();
  // Texture.clone shares Source. Replacing .image would also replace the original.
  edited.source = new Source(image);
  return edited;
}

export async function loadColorControls(gltf: GLTF): Promise<ColorControl[]> {
  const materials = new Set<MeshStandardMaterial>();
  gltf.scene.traverse((node) => {
    if (node instanceof Mesh)
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        if (material instanceof MeshStandardMaterial) materials.add(material);
  });
  const controls: ColorControl[] = [];
  try {
    for (const material of materials) {
      const parsed = metadata.safeParse(material.userData);
      if (!parsed.success || !material.map) continue;
      const info = parsed.data;
      if ((info.nifBaseColorTexture.texCoord ?? 0) !== (info.nifColorControlTexture.texCoord ?? 0))
        throw new Error('Color mask and diffuse coordinates differ');
      const base: unknown = await gltf.parser.getDependency(
        'texture',
        info.nifBaseColorTexture.index
      );
      const mask: unknown = await gltf.parser.getDependency(
        'texture',
        info.nifColorControlTexture.index
      );
      if (!(base instanceof Texture) || !(mask instanceof Texture))
        throw new Error('Invalid color textures');
      const read = (texture: Texture): Pixels => {
        const source = texture.image as CanvasImageSource & { width: number; height: number };
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(source, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };
      const diffuse = read(base),
        control = read(mask);
      const mode = (texture: Texture): Sampling => ({
        linear: texture.magFilter !== NearestFilter,
        wrapS: texture.wrapS === RepeatWrapping,
        wrapT: texture.wrapT === RepeatWrapping
      });
      const prepared = prepareColorBake(diffuse, control, mode(base), mode(mask));
      const original = material.map;
      const canvas = document.createElement('canvas');
      canvas.width = prepared.pixels.width;
      canvas.height = prepared.pixels.height;
      const context = canvas.getContext('2d')!;
      const image = context.createImageData(canvas.width, canvas.height);
      const edited = editableTexture(original, canvas);
      const colors = info.nifOverrideColors.map((color): Rgb => [...color]);
      let painted: Rgb[] | undefined;
      const apply = () => {
        if (
          painted &&
          colors.every(
            (color, index) =>
              !prepared.activeChannels[index] ||
              color.every((value, channel) => value === painted![index][channel])
          )
        )
          return;
        const pixels = prepared.bake(colors);
        image.data.set(pixels.data);
        context.putImageData(image, 0, 0);
        material.map = edited;
        edited.needsUpdate = true;
        painted = colors.map((color) => [...color] as Rgb);
      };
      controls.push({
        label: material.name,
        shader: info.nifShader,
        colors,
        activeChannels: prepared.activeChannels,
        set(index, color) {
          if (index < 0 || index > 2) throw new Error('Invalid color channel');
          colors[index] = [...color];
          apply();
        },
        setColors(values) {
          if (values.length !== 3) throw new Error('Three override colors are required');
          colors.splice(0, 3, ...values.map((color): Rgb => [...color]));
          apply();
        },
        reset() {
          colors.splice(0, 3, ...info.nifOverrideColors.map((color): Rgb => [...color]));
          material.map = original;
          painted = undefined;
        },
        dispose() {
          material.map = original;
          edited.dispose();
          base.dispose();
          mask.dispose();
        }
      });
    }
    return controls;
  } catch (error) {
    for (const control of controls) control.dispose();
    throw error;
  }
}
