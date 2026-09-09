import { describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderLib,
  NoColorSpace,
  Texture,
  WebGLRenderer
} from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { applyCharacterMaterials, halfLambert } from '../src/lib/outfits/characterMaterials';

function fixture(enabled: boolean, gloss = false) {
  const material = new MeshStandardMaterial({ map: new Texture() });
  material.userData = {
    nifShader: 'MS2CharacterMaterial',
    nifLighting: { specular: [0.2, 0.4, 0.6], specularEnabled: enabled, power: 40, ColorBoost: 1 },
    ...(gloss ? { nifTextures: { slot3: { index: 3 } } } : {})
  };
  const scene = new Group();
  scene.add(new Mesh(new BoxGeometry(), material));
  const source = new Texture();
  const dependency = vi.fn(async () => source);
  const gltf = { scene, parser: { getDependency: dependency } } as unknown as GLTF;
  return { material, gltf, dependency };
}

describe('source character lighting', () => {
  it('keeps authored scene ambient local to its material and defaults other materials to zero', async () => {
    for (const ambient of [undefined, [1, 0.5, 0.25]]) {
      const { material, gltf } = fixture(false);
      Object.assign(material.userData.nifLighting, { sceneAmbient: ambient });
      await applyCharacterMaterials(gltf);
      const shader = {
        vertexShader: ShaderLib.standard.vertexShader,
        fragmentShader: ShaderLib.standard.fragmentShader,
        uniforms: {}
      } as Parameters<typeof material.onBeforeCompile>[0];
      material.onBeforeCompile(shader, {} as WebGLRenderer);
      expect(shader.uniforms.ms2SceneAmbient.value.toArray()).toEqual(ambient ?? [0, 0, 0]);
      expect(shader.fragmentShader).toContain('(irradiance * RECIPROCAL_PI + ms2SceneAmbient)');
    }
  });
  it('keeps the client half-Lambert response at front, side and back normals', () => {
    expect([-1, -0.5, 0, 0.5, 1].map(halfLambert)).toEqual([0, 0.0625, 0.25, 0.5625, 1]);
  });
  it('honors the specular enable flag instead of making the face glossy', async () => {
    for (const enabled of [false, true]) {
      const { material, gltf } = fixture(enabled);
      await applyCharacterMaterials(gltf);
      const shader = {
        vertexShader: ShaderLib.standard.vertexShader,
        fragmentShader: ShaderLib.standard.fragmentShader,
        uniforms: {}
      } as Parameters<typeof material.onBeforeCompile>[0];
      material.onBeforeCompile(shader, {} as WebGLRenderer);
      expect(shader.uniforms.ms2Specular.value.toArray()).toEqual(
        enabled ? [0.2, 0.4, 0.6] : [0, 0, 0]
      );
      expect(shader.uniforms.ms2Power.value).toBe(40);
    }
  });
  it('uses the declared gloss texture and releases the owned copy with its material', async () => {
    const { material, gltf, dependency } = fixture(true, true);
    await applyCharacterMaterials(gltf);
    expect(dependency).toHaveBeenCalledWith('texture', 3);
    const shader = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
      uniforms: {}
    } as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, {} as WebGLRenderer);
    const dispose = vi.fn();
    (shader.uniforms.ms2GlossMap.value as Texture).addEventListener('dispose', dispose);
    material.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });
  it('loads the hair direction as data, keeps the dye map, and owns its texture copy', async () => {
    const { material, gltf, dependency } = fixture(true, true);
    material.userData.nifShader = 'MS2CharacterHairMaterial';
    material.userData.nifTextures.shader1 = { index: 4 };
    material.normalMap = new Texture();
    const dyeMap = material.map;
    await applyCharacterMaterials(gltf);
    const shader = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
      uniforms: {}
    } as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, {} as WebGLRenderer);
    const direction = shader.uniforms.ms2HairDirectionMap.value as Texture;
    expect(dependency).toHaveBeenCalledWith('texture', 4);
    expect(direction.colorSpace).toBe(NoColorSpace);
    expect(material.map).toBe(dyeMap);
    expect(shader.fragmentShader).toContain(
      'ms2HairSpecular(geometryNormal, halfVector, ms2HairTangent'
    );
    const dispose = vi.fn();
    direction.addEventListener('dispose', dispose);
    material.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });
  it('rejects missing hair directions and mismatched tangent coordinates', async () => {
    const { material, gltf } = fixture(true, true);
    material.userData.nifShader = 'MS2CharacterHairMaterial';
    await expect(applyCharacterMaterials(gltf)).rejects.toThrow('Missing source hair direction');
    material.normalMap = new Texture();
    material.userData.nifTextures.shader1 = { index: 4, texCoord: 1 };
    await expect(applyCharacterMaterials(gltf)).rejects.toThrow(
      'matching normal-map tangent frame'
    );
  });
  it('uses authored ambient and rim values without retaining physical indirect specular', async () => {
    const { material, gltf } = fixture(false);
    Object.assign(material.userData.nifLighting, {
      ambient: [0.7, 0.6, 0.5],
      FresnelBoost: 10,
      FresnelExponent: 4
    });
    await applyCharacterMaterials(gltf);
    const shader = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
      uniforms: {}
    } as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, {} as WebGLRenderer);
    expect(shader.uniforms.ms2Ambient.value.toArray()).toEqual([0.7, 0.6, 0.5]);
    expect(shader.uniforms.ms2FresnelBoost.value).toBe(10);
    expect(shader.uniforms.ms2FresnelExponent.value).toBe(4);
    expect(shader.fragmentShader).toContain('#undef RE_IndirectSpecular');
    expect(shader.fragmentShader).toContain('#define RE_IndirectDiffuse RE_IndirectDiffuse_MS2');
  });
});
