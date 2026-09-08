import {
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  Vector4
} from 'three';
import { DataTexture, LinearFilter, RGBAFormat, UnsignedByteType } from 'three';
import { bakeColors, type ColorControl, type Pixels, type Rgb } from './materialColors';
import { z } from 'zod';
import { sourceName } from './sharedSkeleton';

export const decalSchema = z.object({
  texture: z.string().regex(/^makeup\/item_makeup\/[a-z0-9_]+\.png$/),
  mask: z
    .string()
    .regex(/^makeup\/item_makeup\/[a-z0-9_]+\.png$/)
    .optional(),
  transform: z.tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().positive()
  ]),
  placements: z
    .array(
      z.tuple([
        z.number().finite(),
        z.number().finite(),
        z.number().finite(),
        z.number().positive()
      ])
    )
    .optional(),
  scaleRange: z.tuple([z.number().positive(), z.number().positive()]).optional()
});
export type FaceDecalData = z.infer<typeof decalSchema>;
type DecalOptions = { translation?: string; rotation?: string };
const bindings = new WeakMap<
  MeshStandardMaterial,
  {
    texture: { value: Texture };
    transform: { value: Vector4 };
  }
>();

export function validateDecalPosition(x: number, y: number, angle: number) {
  if (
    ![x, y, angle].every(Number.isFinite) ||
    Math.abs(x) > 0.5 ||
    Math.abs(y) > 0.5 ||
    Math.abs(angle) > Math.PI
  )
    throw new Error('Makeup position is outside the face');
}

// Client MS2CharacterSkinMaterial: TexCoordTransform2D, followed by alpha blend.
export function decalUv(u: number, v: number, [x, y, angle, scale]: FaceDecalData['transform']) {
  const a = (u - 0.5 - x) * 2,
    b = v - 0.5 - y;
  const c = Math.cos(-angle),
    s = Math.sin(-angle);
  return [(c * a - s * b) / scale + 0.5, (s * a + c * b) / scale + 0.5];
}

export class FaceDecal {
  private restores: (() => void)[] = [];
  private transform = new Vector4();
  control?: ColorControl;
  private constructor(
    private texture: Texture,
    private data: FaceDecalData,
    private materials: MeshStandardMaterial[],
    private options: DecalOptions
  ) {
    this.transform.set(...data.transform);
  }
  get controls() {
    return {
      placements: this.data.placements ?? [this.data.transform],
      scaleRange: this.data.scaleRange ?? [this.data.transform[3], this.data.transform[3]],
      value: this.transform.toArray(),
      movable: this.options.translation === '1',
      rotatable: this.options.rotation === '1',
      move: (x: number, y: number) => {
        validateDecalPosition(x, y, this.transform.z);
        if (this.options.translation !== '1') throw new Error('This makeup has a fixed position');
        this.transform.x = x;
        this.transform.y = y;
      },
      rotate: (angle: number) => {
        validateDecalPosition(this.transform.x, this.transform.y, angle);
        if (this.options.rotation !== '1') throw new Error('This makeup has a fixed rotation');
        this.transform.z = angle;
      },
      place: (index: number) => {
        const value = (this.data.placements ?? [this.data.transform])[index];
        if (!value) throw new Error('Unknown source makeup placement');
        this.transform.set(...value);
      },
      scale: (value: number) => {
        const [min, max] = this.data.scaleRange ?? [this.data.transform[3], this.data.transform[3]];
        if (!Number.isFinite(value) || value < min || value > max)
          throw new Error('Unsupported makeup scale');
        this.transform.w = value;
      },
      reset: () => this.transform.set(...this.data.transform)
    };
  }
  static async load(
    data: FaceDecalData,
    base: string,
    body: Object3D,
    defaults?: Rgb[],
    options: DecalOptions = {}
  ) {
    const materials: MeshStandardMaterial[] = [];
    body.traverse((node) => {
      if (!(node instanceof Mesh) || sourceName(node) !== 'FA_Skin') return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        if (material instanceof MeshStandardMaterial && material.map) materials.push(material);
    });
    if (!materials.length) throw new Error('This body has no supported face skin for makeup');
    let texture: Texture;
    let source: Pixels | undefined, mask: Pixels | undefined;
    if (data.mask) {
      if (!defaults) throw new Error('Makeup dye defaults are unavailable');
      const raw = async (path: string): Promise<Pixels> => {
        const response = await fetch(base + path.replace(/\.png$/, '.json'));
        if (!response.ok) throw new Error('Makeup dye texture is unavailable');
        const value = z
          .object({
            width: z.number().int().positive().max(4096),
            height: z.number().int().positive().max(4096),
            rgba: z.string()
          })
          .parse(await response.json());
        const pixels = Uint8ClampedArray.from(atob(value.rgba), (c) => c.charCodeAt(0));
        if (pixels.length !== value.width * value.height * 4)
          throw new Error('Invalid makeup pixels');
        return { width: value.width, height: value.height, data: pixels };
      };
      [source, mask] = await Promise.all([raw(data.texture), raw(data.mask)]);
      texture = new DataTexture(
        new Uint8Array(source.data),
        source.width,
        source.height,
        RGBAFormat,
        UnsignedByteType
      );
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
    } else texture = await new TextureLoader().loadAsync(`${base}${data.texture}`);
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    const result = new FaceDecal(texture, data, materials, options);
    if (source && mask && defaults) {
      const colors = defaults.map((c): Rgb => [...c]);
      const original = defaults.map((c): Rgb => [...c]);
      const diffuse = source,
        control = mask;
      const recolor = () => {
        const sampling = { linear: true, wrapS: false, wrapT: false };
        const pixels = bakeColors(diffuse, control, colors, sampling, sampling);
        texture.image = {
          data: new Uint8Array(pixels.data),
          width: pixels.width,
          height: pixels.height
        };
        texture.needsUpdate = true;
      };
      result.control = {
        label: 'Makeup',
        shader: 'Makeup',
        colors,
        set: (index, value) => {
          colors[index] = [...value];
          recolor();
        },
        setColors: (values) => {
          colors.splice(0, 3, ...values.map((v): Rgb => [...v]));
          recolor();
        },
        reset: () => {
          colors.splice(0, 3, ...original.map((v): Rgb => [...v]));
          recolor();
        },
        dispose: () => {}
      };
      recolor();
    }
    return result;
  }
  attach() {
    for (const material of this.materials) {
      // Three retains compiled uniforms per material/program. Repoint the same
      // uniform objects when replacing makeup so cached programs use the new item.
      const binding = bindings.get(material) ?? {
        texture: { value: this.texture },
        transform: { value: this.transform }
      };
      binding.texture.value = this.texture;
      binding.transform.value = this.transform;
      bindings.set(material, binding);
      const compile = material.onBeforeCompile,
        key = material.customProgramCacheKey;
      material.onBeforeCompile = (shader, renderer) => {
        compile.call(material, shader, renderer);
        shader.uniforms.faceDecal = binding.texture;
        shader.uniforms.faceDecalTransform = binding.transform;
        shader.fragmentShader =
          `uniform sampler2D faceDecal;\nuniform vec4 faceDecalTransform;\n` +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          #ifdef USE_MAP
          vec2 decalPoint = vMapUv - vec2(0.5) - faceDecalTransform.xy;
          decalPoint.x *= 2.0;
          float decalSin = sin(-faceDecalTransform.z), decalCos = cos(-faceDecalTransform.z);
          vec2 decalUV = vec2(decalCos * decalPoint.x - decalSin * decalPoint.y,
                             decalSin * decalPoint.x + decalCos * decalPoint.y) / faceDecalTransform.w + vec2(0.5);
          vec4 decalColor = texture2D(faceDecal, clamp(decalUV, 0.0, 1.0));
          // Composite the texel before characterMaterials captures it for ambient
          // lighting, and use that same texel with MatDiffuse for direct light.
          sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, decalColor.rgb, decalColor.a);
          diffuseColor.rgb = diffuse * sampledDiffuseColor.rgb;
          #endif
        `
        );
      };
      material.customProgramCacheKey = () => `${key.call(material)}:source-face-decal-v2`;
      material.needsUpdate = true;
      this.restores.push(() => {
        material.onBeforeCompile = compile;
        material.customProgramCacheKey = key;
        material.needsUpdate = true;
      });
    }
  }
  dispose() {
    for (const restore of this.restores) restore();
    this.restores = [];
    this.texture.dispose();
  }
}
