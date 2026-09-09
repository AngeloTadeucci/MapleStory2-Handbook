import { expect, it } from 'vitest';
import { LessEqualDepth, MeshStandardMaterial, ShaderLib, WebGLRenderer } from 'three';
import { applySourceRenderState } from '../src/lib/outfits/sourceRenderState';

function shaderFor(material: MeshStandardMaterial) {
  const shader = {
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
    uniforms: {}
  } as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader.fragmentShader;
}
it('restores Casual Bun source depth writes while retaining blending and rejecting zero-alpha fragments', () => {
  const material = new MeshStandardMaterial({ transparent: true, depthWrite: false });
  material.userData.nifRenderState = { depthFlags: 15, alphaFlags: 4845, alphaThreshold: 0 };
  applySourceRenderState(material);
  expect(material.transparent).toBe(true);
  expect(material.depthTest).toBe(true);
  expect(material.depthWrite).toBe(true);
  expect(material.depthFunc).toBe(LessEqualDepth);
  expect(shaderFor(material)).toContain('if (!(diffuseColor.a > 0.000000000000)) discard;');
  expect(material.alphaTest).toBe(0);
});
it('honors explicit disabled depth writes instead of forcing them on every transparent material', () => {
  const material = new MeshStandardMaterial({ depthWrite: true });
  material.userData.nifRenderState = { depthFlags: 13 };
  applySourceRenderState(material);
  expect(material.depthTest).toBe(true);
  expect(material.depthWrite).toBe(false);
});
it('keeps the loader settings for assets without source metadata', () => {
  const material = new MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    alphaTest: 0.5
  });
  const hook = material.onBeforeCompile;
  applySourceRenderState(material);
  expect(material.depthWrite).toBe(false);
  expect(material.alphaTest).toBe(0.5);
  expect(material.onBeforeCompile).toBe(hook);
});
it('distinguishes inclusive alpha tests and shader cache entries', () => {
  const strict = new MeshStandardMaterial(),
    inclusive = new MeshStandardMaterial();
  strict.userData.nifRenderState = { alphaFlags: 512 | (4 << 10), alphaThreshold: 128 };
  inclusive.userData.nifRenderState = { alphaFlags: 512 | (6 << 10), alphaThreshold: 128 };
  applySourceRenderState(strict);
  applySourceRenderState(inclusive);
  expect(shaderFor(inclusive)).toContain('diffuseColor.a >= 0.501960784314');
  expect(shaderFor(strict)).toContain('diffuseColor.a > 0.501960784314');
  expect(strict.customProgramCacheKey()).not.toBe(inclusive.customProgramCacheKey());
});
