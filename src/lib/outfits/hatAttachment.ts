import { Euler, Matrix4, Mesh, Object3D, Quaternion, Ray, SkinnedMesh, Vector3 } from 'three';
import type { NativeAsset } from '$lib/nativeAssets';
import { sourceName } from './sharedSkeleton';
import source from './hat-placement-source.json';

export type HatPlacement = { position: number[]; rotation: number[] };
const placements: Record<string, HatPlacement> = source.items;
export function hatPlacementSource(hairPreset: number): HatPlacement | undefined {
  return placements[String(hairPreset)];
}

// Compatibility for the two diagnosed release-14 rigid caps. Other releases,
// fitted hats and private character assets retain their original bindings.
export function needsHatPlacement(asset: NativeAsset): boolean {
  return (
    ['wardrobe-fbb6ec3687b62815b3fb4de0', 'wardrobe-f5ce58f738334c90c520c2d7'].includes(asset.id) &&
    new URL(asset.url).pathname.includes('/simulator-release-14/')
  );
}

export function fitMovableHat(root: Object3D, placement: HatPlacement, hair: Object3D): number {
  const meshes: SkinnedMesh[] = [];
  root.traverse((node) => {
    if (!(node instanceof SkinnedMesh)) return;
    if (node.skeleton.bones.length !== 1 || sourceName(node.skeleton.bones[0]) !== 'Bip01 Head')
      throw new Error('Movable hat needs a single head attachment');
    meshes.push(node);
  });
  if (!meshes.length) throw new Error('Movable hat has no skinned mesh');
  // Unlike hair custom presets, capTransform angles are already radians.
  // KMS2 0x1411e5c10 replaces the CP local transform with the hair's capTransform,
  // then casts along transformed -Z from 400 source units behind that point.
  const rotation = new Quaternion().setFromEuler(
    new Euler(-placement.rotation[0], -placement.rotation[1], -placement.rotation[2], 'XYZ')
  );
  const position = new Vector3().fromArray(placement.position);
  const direction = new Vector3(0, 0, -1).applyQuaternion(rotation);
  const ray = new Ray(position.clone().addScaledVector(direction, -400), direction);
  const head = meshes[0].skeleton.bones[0];
  head.updateWorldMatrix(true, false);
  const toHead = head.matrixWorld.clone().invert();
  hair.updateWorldMatrix(true, true);
  let nearest = Infinity;
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    hit = new Vector3();
  hair.traverseVisible((node) => {
    if (!(node instanceof Mesh)) return;
    const geometry = node.geometry;
    const index = geometry.index;
    const count = index?.count ?? geometry.attributes.position.count;
    const transform = toHead.clone().multiply(node.matrixWorld);
    for (let i = 0; i + 2 < count; i += 3) {
      node.getVertexPosition(index ? index.getX(i) : i, a).applyMatrix4(transform);
      node.getVertexPosition(index ? index.getX(i + 1) : i + 1, b).applyMatrix4(transform);
      node.getVertexPosition(index ? index.getX(i + 2) : i + 2, c).applyMatrix4(transform);
      if (!ray.intersectTriangle(a, b, c, false, hit)) continue;
      const distance = hit.distanceTo(ray.origin);
      if (distance < nearest) {
        nearest = distance;
        position.copy(hit);
      }
    }
  });
  // No intersection keeps the authored default, matching the client's fallback.
  // Skin bindings are head-local transforms here, not inverse(headWorld).
  const transform = new Matrix4().compose(position, rotation, new Vector3(1, 1, 1));
  for (const mesh of meshes) {
    mesh.skeleton.boneInverses = [transform.clone()];
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }
  return nearest;
}
