import { Mesh, MeshStandardMaterial, NoColorSpace, Texture, Vector3 } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { z } from 'zod';

const lightingSchema = z.object({
  nifShader: z.enum([
    'MS2CharacterMaterial',
    'MS2CharacterSkinMaterial',
    'MS2CharacterHairMaterial'
  ]),
  nifLighting: z.object({
    specularEnabled: z.boolean(),
    specular: z.tuple([
      z.number().nonnegative(),
      z.number().nonnegative(),
      z.number().nonnegative()
    ]),
    power: z.number().nonnegative(),
    ColorBoost: z.number().nonnegative().optional()
  }),
  nifTextures: z
    .object({
      slot3: z
        .object({ index: z.number().int().nonnegative(), texCoord: z.number().int().optional() })
        .optional()
    })
    .optional()
});

// MS2CharacterMaterial/Shader0001-P.hlsl MS2CharacterLight. Retain the
// simulator's studio lights; this does not reproduce the client's scene lighting.
export function halfLambert(dot: number): number {
  return (0.5 * Math.max(-1, Math.min(1, dot)) + 0.5) ** 2;
}

export async function applyCharacterMaterials(gltf: GLTF, sourceSpecular = true): Promise<void> {
  const materials = new Set<MeshStandardMaterial>();
  gltf.scene.traverse((node) => {
    if (node instanceof Mesh)
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        if (material instanceof MeshStandardMaterial) materials.add(material);
  });
  for (const material of materials) {
    const parsed = lightingSchema.safeParse(material.userData);
    if (!parsed.success || !material.map) continue;
    const info = parsed.data;
    const descriptor = info.nifTextures?.slot3;
    let gloss: Texture | undefined;
    if (sourceSpecular && descriptor) {
      if ((descriptor.texCoord ?? 0) !== material.map.channel)
        throw new Error('Gloss and diffuse UV coordinates differ');
      const texture: unknown = await gltf.parser.getDependency('texture', descriptor.index);
      if (!(texture instanceof Texture)) throw new Error('Invalid gloss texture');
      gloss = texture.clone();
      gloss.colorSpace = NoColorSpace;
      gloss.needsUpdate = true;
      material.addEventListener('dispose', () => gloss?.dispose());
    }
    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.ms2Specular = {
        value: info.nifLighting.specularEnabled
          ? new Vector3(...info.nifLighting.specular)
          : new Vector3()
      };
      shader.uniforms.ms2Power = { value: info.nifLighting.power };
      shader.uniforms.ms2ColorBoost = { value: info.nifLighting.ColorBoost ?? 1 };
      if (gloss) shader.uniforms.ms2GlossMap = { value: gloss };
      shader.fragmentShader =
        `uniform vec3 ms2Specular;
uniform float ms2Power;
uniform float ms2ColorBoost;
${gloss ? 'uniform sampler2D ms2GlossMap;' : ''}
vec3 ms2Gloss = vec3(1.0);
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_physical_pars_fragment>',
        `#include <lights_physical_pars_fragment>
void RE_Direct_MS2(const in IncidentLight directLight, const in vec3 geometryPosition,
  const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  float halfLambert = pow(0.5 * dot(geometryNormal, directLight.direction) + 0.5, 2.0);
  reflectedLight.directDiffuse += halfLambert * directLight.color * BRDF_Lambert(material.diffuseContribution) * ms2ColorBoost;
  ${
    sourceSpecular
      ? `vec3 halfVector = normalize(directLight.direction + geometryViewDir);
  float specularIntensity = pow(max(0.00001, dot(geometryNormal, halfVector)), ms2Power);
  reflectedLight.directSpecular += (halfLambert > 0.0 ? specularIntensity : 0.0) * directLight.color * ms2Specular * ms2Gloss;`
      : `float dotNL = saturate(dot(geometryNormal, directLight.direction));
  reflectedLight.directSpecular += dotNL * directLight.color * BRDF_GGX_Multiscatter(directLight.direction, geometryViewDir, geometryNormal, material);`
  }
}
#undef RE_Direct
#define RE_Direct RE_Direct_MS2`
      );
      if (gloss)
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nms2Gloss = texture2D(ms2GlossMap, vMapUv).rgb;'
        );
    };
    material.customProgramCacheKey = () =>
      `${previousKey}:ms2-light-v1:${sourceSpecular}:${Boolean(gloss)}`;
    material.needsUpdate = true;
  }
}
