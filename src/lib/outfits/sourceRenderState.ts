import {
  AlwaysDepth,
  EqualDepth,
  GreaterDepth,
  GreaterEqualDepth,
  LessDepth,
  LessEqualDepth,
  MeshStandardMaterial,
  NeverDepth,
  NotEqualDepth
} from 'three';
import { z } from 'zod';

const stateSchema = z.object({
  depthFlags: z.number().int().min(0).max(65535).optional(),
  alphaFlags: z.number().int().min(0).max(65535).optional(),
  alphaThreshold: z.number().int().min(0).max(255).optional()
});

// NiZBufferProperty and NiAlphaProperty use the NIF TestFunction ordering.
// https://github.com/niftools/nifxml/blob/develop/nif.xml
const depthFunctions = [
  AlwaysDepth,
  LessDepth,
  EqualDepth,
  LessEqualDepth,
  GreaterDepth,
  NotEqualDepth,
  GreaterEqualDepth,
  NeverDepth
] as const;

export function applySourceRenderState(material: MeshStandardMaterial): void {
  if (material.userData.nifRenderState === undefined) return;
  const state = stateSchema.parse(material.userData.nifRenderState);
  if (state.depthFlags !== undefined) {
    material.depthTest = (state.depthFlags & 1) !== 0;
    material.depthWrite = (state.depthFlags & 2) !== 0;
    material.depthFunc = depthFunctions[(state.depthFlags >> 2) & 7];
  }
  if (state.alphaFlags === undefined || (state.alphaFlags & 512) === 0) return;
  if (state.alphaThreshold === undefined) throw new Error('Source alpha threshold is missing');
  const comparison = (state.alphaFlags >> 10) & 7;
  const threshold = (state.alphaThreshold / 255).toFixed(12);
  const conditions = [
    'true',
    `diffuseColor.a < ${threshold}`,
    `diffuseColor.a == ${threshold}`,
    `diffuseColor.a <= ${threshold}`,
    `diffuseColor.a > ${threshold}`,
    `diffuseColor.a != ${threshold}`,
    `diffuseColor.a >= ${threshold}`,
    'false'
  ];
  // Keep blending, but discard according to the source comparison before writing depth.
  // Three's alphaTest uses >= and cannot express the client's strict > 0 test.
  material.alphaTest = 0;
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      `#include <alphatest_fragment>\nif (!(${conditions[comparison]})) discard;`
    );
  };
  material.customProgramCacheKey = () => `${key}|nif-alpha:${comparison}:${threshold}`;
  material.needsUpdate = true;
}
