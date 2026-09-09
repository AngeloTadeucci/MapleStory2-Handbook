import { Mesh, MeshStandardMaterial, NoColorSpace, Texture, Vector3 } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { z } from 'zod';
import { applySourceRenderState } from './sourceRenderState';

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
    sceneAmbient: z
      .tuple([z.number().nonnegative(), z.number().nonnegative(), z.number().nonnegative()])
      .optional(),
    ambient: z
      .tuple([z.number().nonnegative(), z.number().nonnegative(), z.number().nonnegative()])
      .optional(),
    ColorBoost: z.number().nonnegative().optional(),
    FresnelBoost: z.number().nonnegative().optional(),
    FresnelExponent: z.number().nonnegative().optional()
  }),
  nifTextures: z
    .object({
      slot3: z
        .object({ index: z.number().int().nonnegative(), texCoord: z.number().int().optional() })
        .optional(),
      shader1: z
        .object({ index: z.number().int().nonnegative(), texCoord: z.number().int().optional() })
        .optional()
    })
    .optional()
});

// These functions also run in the browser's numerical shader acceptance checks.
// MS2CharacterMaterial and MS2CharacterHairMaterial/Shader0001-P.hlsl.
export const characterLightingFunctions = /* glsl */ `
float ms2HalfLambert(float dotNL) {
  return pow(0.5 * dotNL + 0.5, 2.0);
}
float ms2Rim(vec3 normal, vec3 viewDirection, vec3 rimDirection, float boost, float exponent) {
  float fresnel = boost * pow(max(0.0, 1.0 - abs(dot(normal, viewDirection))), exponent);
  return max(0.0, -dot(rimDirection, normal)) * fresnel;
}
float ms2SurfaceSpecular(vec3 normal, vec3 halfVector, float power) {
  return pow(max(0.00001, dot(normal, halfVector)), power);
}
float ms2HairSpecular(vec3 normal, vec3 halfVector, vec3 tangent, float power) {
  float dotTH = dot(tangent, halfVector);
  return 0.5 * (ms2SurfaceSpecular(normal, halfVector, power)
    + pow(max(0.00001, 1.0 - dotTH * dotTH), power));
}
`;

export function halfLambert(dot: number): number {
  return (0.5 * Math.max(-1, Math.min(1, dot)) + 0.5) ** 2;
}

export async function applyCharacterMaterials(gltf: GLTF): Promise<void> {
  const materials = new Set<MeshStandardMaterial>();
  gltf.scene.traverse((node) => {
    if (node instanceof Mesh)
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        if (material instanceof MeshStandardMaterial) materials.add(material);
  });
  for (const material of materials) {
    applySourceRenderState(material);
    const parsed = lightingSchema.safeParse(material.userData);
    if (!parsed.success || !material.map) continue;
    const info = parsed.data;
    const hair = info.nifShader === 'MS2CharacterHairMaterial';
    const hairDescriptor = hair ? info.nifTextures?.shader1 : undefined;
    if (hair && !hairDescriptor) throw new Error('Missing source hair direction texture');
    let hairDirection: Texture | undefined;
    if (hairDescriptor) {
      if (!material.normalMap || (hairDescriptor.texCoord ?? 0) !== material.map.channel)
        throw new Error('Hair direction requires the matching normal-map tangent frame');
      const texture: unknown = await gltf.parser.getDependency('texture', hairDescriptor.index);
      if (!(texture instanceof Texture)) throw new Error('Invalid hair direction texture');
      hairDirection = texture.clone();
      hairDirection.colorSpace = NoColorSpace;
      hairDirection.needsUpdate = true;
      material.addEventListener('dispose', () => hairDirection?.dispose());
    }
    const descriptor = info.nifTextures?.slot3;
    let gloss: Texture | undefined;
    if (descriptor) {
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
      shader.uniforms.ms2Ambient = {
        value: new Vector3(...(info.nifLighting.ambient ?? [1, 1, 1]))
      };
      shader.uniforms.ms2SceneAmbient = {
        value: new Vector3(...(info.nifLighting.sceneAmbient ?? [0, 0, 0]))
      };
      shader.uniforms.ms2ColorBoost = { value: info.nifLighting.ColorBoost ?? 1 };
      shader.uniforms.ms2FresnelBoost = { value: info.nifLighting.FresnelBoost ?? 0 };
      shader.uniforms.ms2FresnelExponent = { value: info.nifLighting.FresnelExponent ?? 4 };
      // Studio direction in world coordinates, not a recovered client scene uniform.
      shader.uniforms.ms2RimDirection = { value: new Vector3(0, -1, 0) };
      if (hairDirection) shader.uniforms.ms2HairDirectionMap = { value: hairDirection };
      if (gloss) shader.uniforms.ms2GlossMap = { value: gloss };
      shader.fragmentShader =
        `uniform vec3 ms2Specular;
uniform float ms2Power;
uniform vec3 ms2Ambient;
uniform vec3 ms2SceneAmbient;
uniform float ms2ColorBoost;
uniform float ms2FresnelBoost;
uniform float ms2FresnelExponent;
uniform vec3 ms2RimDirection;
${gloss ? 'uniform sampler2D ms2GlossMap;' : ''}
${hairDirection ? 'uniform sampler2D ms2HairDirectionMap;\nvec3 ms2HairTangent;' : ''}
vec3 ms2Gloss = vec3(1.0);
vec3 ms2BaseTexel = vec3(1.0);
${characterLightingFunctions}
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_physical_pars_fragment>',
        `#include <lights_physical_pars_fragment>
void RE_Direct_MS2(const in IncidentLight directLight, const in vec3 geometryPosition,
  const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  float halfLambert = ms2HalfLambert(dot(geometryNormal, directLight.direction));
  vec3 rimDirection = (viewMatrix * vec4(ms2RimDirection, 0.0)).xyz;
  float rim = ms2Rim(geometryNormal, geometryViewDir, rimDirection, ms2FresnelBoost, ms2FresnelExponent);
  reflectedLight.directDiffuse += (halfLambert + rim) * directLight.color * BRDF_Lambert(material.diffuseContribution) * ms2ColorBoost;
  vec3 halfVector = normalize(directLight.direction + geometryViewDir);
  float specularIntensity = ${hairDirection ? 'ms2HairSpecular(geometryNormal, halfVector, ms2HairTangent, ms2Power)' : 'ms2SurfaceSpecular(geometryNormal, halfVector, ms2Power)'};
  // Convert the rig's Three irradiance to the same source coefficient as diffuse.
  reflectedLight.directSpecular += (halfLambert > 0.0 ? specularIntensity : 0.0) * directLight.color * RECIPROCAL_PI * ms2Specular * ms2Gloss;
}
void RE_IndirectDiffuse_MS2(const in vec3 irradiance, const in vec3 geometryPosition,
  const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  reflectedLight.indirectDiffuse += (irradiance * RECIPROCAL_PI + ms2SceneAmbient) * ms2Ambient * ms2BaseTexel * ms2ColorBoost;
}
#undef RE_Direct
#define RE_Direct RE_Direct_MS2
#undef RE_IndirectDiffuse
#define RE_IndirectDiffuse RE_IndirectDiffuse_MS2
#undef RE_IndirectSpecular`
      );
      // Client ambient uses MatAmbient, independently of MatDiffuse. The map
      // chunk's diffuseColor already contains MatDiffuse, so retain its texel.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
#ifdef USE_MAP
ms2BaseTexel = sampledDiffuseColor.rgb;
#endif`
      );
      if (hairDirection)
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
vec2 ms2LocalHair = texture2D(ms2HairDirectionMap, vMapUv).rg * 2.0 - 1.0;
ms2HairTangent = normalize(tbn[0] * ms2LocalHair.x + tbn[1] * ms2LocalHair.y);`
        );
      if (gloss)
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nms2Gloss = texture2D(ms2GlossMap, vMapUv).rgb;'
        );
    };
    material.customProgramCacheKey = () =>
      `${previousKey}:ms2-light-v3:${Boolean(gloss)}:${Boolean(hairDirection)}`;
    material.needsUpdate = true;
  }
}
