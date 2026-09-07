import { describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderLib,
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
});
