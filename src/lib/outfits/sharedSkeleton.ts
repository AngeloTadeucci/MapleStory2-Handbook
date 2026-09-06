import { Bone, Group, Matrix4, Object3D, Skeleton, SkinnedMesh } from 'three';

// GLTFLoader sanitizes Object3D.name for animation binding. userData.name retains
// the exact glTF name, including spaces and legitimate helper bone names.
export function sourceName(node: Object3D): string {
  const original: unknown = node.userData.name;
  return typeof original === 'string' ? original : node.name;
}

export type BodySkeleton = Map<string, { bone: Bone; restWorld: Matrix4 }>;

export function captureBodySkeleton(body: Object3D): BodySkeleton {
  // glTF only marks nodes listed in a skin as joints. Attachment helpers such as
  // Weapon_Side_L_Point may not deform the naked body, but equipment needs them.
  const helpers: Object3D[] = [];
  body.traverse((node) => {
    if (
      !(node instanceof Bone) &&
      !('isMesh' in node) &&
      typeof node.userData.name === 'string' &&
      node.parent
    )
      helpers.push(node);
  });
  for (const helper of helpers) {
    const parent = helper.parent!;
    const bone = new Bone().copy(helper, false);
    for (const child of [...helper.children]) bone.add(child);
    parent.remove(helper);
    parent.add(bone);
  }
  body.updateMatrixWorld(true);
  const result: BodySkeleton = new Map();
  body.traverse((node) => {
    if (!(node instanceof Bone)) return;
    const name = sourceName(node);
    if (result.has(name)) throw new Error(`Body has duplicate bone ${name}`);
    result.set(name, { bone: node, restWorld: node.matrixWorld.clone() });
  });
  if (!result.size) throw new Error('Body has no skeleton');
  return result;
}

export function shareSkeleton(equipment: Object3D, body: BodySkeleton): Group {
  equipment.updateMatrixWorld(true);
  const meshes: SkinnedMesh[] = [];
  equipment.traverse((node) => {
    if (node instanceof SkinnedMesh) meshes.push(node);
    else if ('isMesh' in node && node.isMesh) {
      throw new Error(`Equipment mesh ${sourceName(node)} has no exported attachment`);
    }
  });
  if (!meshes.length) throw new Error('Equipment has no skinned meshes');
  // Validate the entire item before changing any mesh. A different body rest pose
  // cannot safely share this skeleton even when its bone names happen to match.
  const bindings = meshes.map((mesh) => {
    const bones = mesh.skeleton.bones.map((bone) => {
      const name = sourceName(bone);
      const target = body.get(name);
      if (!target) throw new Error(`Body is missing equipment bone ${name}`);
      if (
        target.restWorld.elements.some(
          (value, i) => Math.abs(value - bone.matrixWorld.elements[i]) > 1e-4
        )
      ) {
        throw new Error(`Equipment rest pose differs at ${name}`);
      }
      return target.bone;
    });
    if (!mesh.matrixWorld.equals(new Matrix4())) {
      throw new Error(`Equipment mesh ${sourceName(mesh)} must be exported at scene origin`);
    }
    return new Skeleton(
      bones,
      mesh.skeleton.boneInverses.map((matrix) => matrix.clone())
    );
  });
  const result = new Group();
  for (const [index, mesh] of meshes.entries()) {
    mesh.bind(bindings[index], mesh.bindMatrix.clone());
    // Keep identity mesh transforms. Joint world matrices already include the
    // converter's single Z-up-centimeters to Y-up-meters transformation.
    result.add(mesh);
    mesh.frustumCulled = false;
  }
  return result;
}
