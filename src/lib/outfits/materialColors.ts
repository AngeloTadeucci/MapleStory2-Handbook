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

export type ColorControl = {
  label: string;
  shader: string;
  paletteId?: string;
  colors: Rgb[];
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
      const original = material.map;
      const canvas = document.createElement('canvas');
      const edited = editableTexture(original, canvas);
      const colors = info.nifOverrideColors.map((color): Rgb => [...color]);
      const apply = () => {
        const pixels = bakeColors(diffuse, control, colors, mode(base), mode(mask));
        canvas.width = pixels.width;
        canvas.height = pixels.height;
        const context = canvas.getContext('2d')!;
        const image = context.createImageData(pixels.width, pixels.height);
        image.data.set(pixels.data);
        context.putImageData(image, 0, 0);
        material.map = edited;
        edited.needsUpdate = true;
      };
      controls.push({
        label: material.name,
        shader: info.nifShader,
        colors,
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
