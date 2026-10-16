import {
  AnimationClip,
  InterpolateDiscrete,
  InterpolateLinear,
  Mesh,
  NumberKeyframeTrack,
  type Material
} from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { z } from 'zod';

const trackSchema = z.object({
  node: z.string(),
  property: z.literal('alpha'),
  materials: z.array(z.number().int().nonnegative()).min(1),
  times: z.array(z.number()).min(1),
  values: z.array(z.number()).min(1),
  interpolation: z.enum(['LINEAR', 'STEP'])
});
const tracksSchema = z.array(trackSchema).optional();

export function materialAnimationTracks(
  clip: AnimationClip,
  meshesByMaterial: ReadonlyMap<number, readonly Mesh[]>
): NumberKeyframeTrack[] {
  const tracks = tracksSchema.parse(clip.userData.nifMaterialTracks) ?? [];
  return tracks.flatMap((track) => {
    if (track.times.length !== track.values.length)
      throw new Error(`Material track ${track.node} has mismatched keys`);
    // Authored B-spline alpha curves can overshoot the displayable range.
    const values = track.values.map((value) => Math.min(1, Math.max(0, value)));
    return track.materials.flatMap((index) => {
      const meshes = meshesByMaterial.get(index);
      if (!meshes?.length)
        throw new Error(`Material track ${track.node} targets missing material ${index}`);
      return meshes.map((mesh) => {
        const keyframes = new NumberKeyframeTrack(
          `${mesh.uuid}.material.opacity`,
          track.times,
          values
        );
        keyframes.setInterpolation(
          track.interpolation === 'STEP' ? InterpolateDiscrete : InterpolateLinear
        );
        return keyframes;
      });
    });
  });
}

export function addMaterialAnimationTracks(gltf: GLTF): void {
  const meshesByMaterial = new Map<number, Mesh[]>();
  gltf.scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
    if (materials.length !== 1) return;
    const index = gltf.parser.associations.get(materials[0])?.materials;
    if (index === undefined) return;
    meshesByMaterial.set(index, [...(meshesByMaterial.get(index) ?? []), node]);
  });
  for (const clip of gltf.animations)
    clip.tracks.push(...materialAnimationTracks(clip, meshesByMaterial));
}
