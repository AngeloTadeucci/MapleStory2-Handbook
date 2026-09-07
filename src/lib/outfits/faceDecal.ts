import {
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  Vector4
} from 'three';
import { z } from 'zod';
import { sourceName } from './sharedSkeleton';

export const decalSchema = z.object({
  texture: z.string().regex(/^makeup\/item_makeup\/[a-z0-9_]+\.png$/),
  transform: z.tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().positive()
  ])
});
export type FaceDecalData = z.infer<typeof decalSchema>;

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
  private constructor(
    private texture: Texture,
    private data: FaceDecalData,
    private materials: MeshStandardMaterial[]
  ) {}
  static async load(data: FaceDecalData, base: string, body: Object3D) {
    const materials: MeshStandardMaterial[] = [];
    body.traverse((node) => {
      if (!(node instanceof Mesh) || sourceName(node) !== 'FA_Skin') return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        if (material instanceof MeshStandardMaterial && material.map) materials.push(material);
    });
    if (!materials.length) throw new Error('This body has no supported face skin for makeup');
    const texture = await new TextureLoader().loadAsync(`${base}${data.texture}`);
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    return new FaceDecal(texture, data, materials);
  }
  attach() {
    for (const material of this.materials) {
      const compile = material.onBeforeCompile,
        key = material.customProgramCacheKey;
      material.onBeforeCompile = (shader, renderer) => {
        compile.call(material, shader, renderer);
        shader.uniforms.faceDecal = { value: this.texture };
        shader.uniforms.faceDecalTransform = { value: new Vector4(...this.data.transform) };
        shader.fragmentShader =
          `uniform sampler2D faceDecal;\nuniform vec4 faceDecalTransform;\n` +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec2 decalPoint = vMapUv - vec2(0.5) - faceDecalTransform.xy;
          decalPoint.x *= 2.0;
          float decalSin = sin(-faceDecalTransform.z), decalCos = cos(-faceDecalTransform.z);
          vec2 decalUV = vec2(decalCos * decalPoint.x - decalSin * decalPoint.y,
                             decalSin * decalPoint.x + decalCos * decalPoint.y) / faceDecalTransform.w + vec2(0.5);
          vec4 decalColor = texture2D(faceDecal, clamp(decalUV, 0.0, 1.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, decalColor.rgb, decalColor.a);
        `
        );
      };
      material.customProgramCacheKey = () => `${key.call(material)}:source-face-decal-v1`;
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
