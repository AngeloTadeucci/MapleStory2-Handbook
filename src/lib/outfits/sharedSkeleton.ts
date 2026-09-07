import {
  AnimationClip,
  AnimationMixer,
  Bone,
  Group,
  Matrix4,
  Object3D,
  PropertyBinding,
  Skeleton,
  SkinnedMesh
} from 'three';

import { defaultEquipmentClip } from './equipmentPlayback';

// GLTFLoader sanitizes Object3D.name for animation binding. userData.name retains
// the exact glTF name, including spaces and legitimate helper bone names.
export function sourceName(node: Object3D): string {
  const original: unknown = node.userData.name;
  return typeof original === 'string' ? original : node.name;
}

export type BodySkeleton = Map<string, { bone: Bone; restWorld: Matrix4 }>;

class EquipmentGroup extends Group {
  readonly attachedRoots: Bone[] = [];
  mixer?: AnimationMixer;
  clips: AnimationClip[] = [];
  current = '';
}

export function equipmentAnimationControls(root: Object3D) {
  const controls: { names: string[]; current: string; set: (name: string) => void }[] = [];
  root.traverse((node) => {
    if (!(node instanceof EquipmentGroup) || !node.mixer || node.clips.length < 2) return;
    controls.push({
      names: node.clips.map((clip) => clip.name),
      get current() {
        return node.current;
      },
      set(name) {
        const clip = node.clips.find((clip) => clip.name === name);
        if (!clip) throw new Error('Unknown equipment animation');
        node.mixer!.stopAllAction();
        node.mixer!.clipAction(clip).reset().play();
        node.current = name;
      }
    });
  });
  return controls;
}

export function equipmentMixers(root: Object3D): AnimationMixer[] {
  const mixers: AnimationMixer[] = [];
  root.traverse((node) => {
    if (node instanceof EquipmentGroup && node.mixer) mixers.push(node.mixer);
  });
  return mixers;
}

export function releaseEquipmentBones(root: Object3D) {
  root.traverse((node) => {
    if (node instanceof EquipmentGroup) {
      node.mixer?.stopAllAction();
      if (node.mixer) node.mixer.uncacheRoot(node.mixer.getRoot());
      node.mixer = undefined;
      for (const bone of node.attachedRoots) bone.removeFromParent();
      node.attachedRoots.length = 0;
    }
  });
}

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

export function shareSkeleton(
  equipment: Object3D,
  body: BodySkeleton,
  clips: AnimationClip[] = []
): Group {
  equipment.updateMatrixWorld(true);
  const meshes: SkinnedMesh[] = [];
  equipment.traverse((node) => {
    if (node instanceof SkinnedMesh) meshes.push(node);
    else if ('isMesh' in node && node.isMesh) {
      throw new Error(`Equipment mesh ${sourceName(node)} has no exported attachment`);
    }
  });
  if (!meshes.length) throw new Error('Equipment has no skinned meshes');
  const privateBones = new Map<Object3D, Bone>();
  const attachments: { bone: Bone; parent: Bone }[] = [];
  const bindBone = (bone: Object3D): Bone => {
    const existing = privateBones.get(bone);
    if (existing) return existing;
    if (bone.userData.equipmentBone === true) {
      if (!bone.parent) throw new Error('Equipment joint has no attachment parent');
      const parent = bindBone(bone.parent);
      const copy = new Bone().copy(bone, false);
      privateBones.set(bone, copy);
      if (bone.parent.userData.equipmentBone === true) parent.add(copy);
      else attachments.push({ bone: copy, parent });
      return copy;
    }
    const name = sourceName(bone);
    const target = body.get(name);
    if (!target) throw new Error(`Body is missing equipment bone ${name}`);
    if (
      target.restWorld.elements.some(
        (value, i) => Math.abs(value - bone.matrixWorld.elements[i]) > 1e-4
      )
    )
      throw new Error(`Equipment rest pose differs at ${name}`);
    return target.bone;
  };
  // Validate the entire item before changing any mesh. A different body rest pose
  // cannot safely share this skeleton even when its bone names happen to match.
  const bindings = meshes.map((mesh) => {
    const bones = mesh.skeleton.bones.map(bindBone);
    if (!mesh.matrixWorld.equals(new Matrix4())) {
      throw new Error(`Equipment mesh ${sourceName(mesh)} must be exported at scene origin`);
    }
    return new Skeleton(
      bones,
      mesh.skeleton.boneInverses.map((matrix) => matrix.clone())
    );
  });
  // Bind tracks to this item's cloned joints by UUID. Names alone would animate
  // the first same-named joint from another equipped item or the body itself.
  const animations = clips.map(
    (clip) =>
      new AnimationClip(
        clip.name,
        clip.duration,
        clip.tracks.map((track) => {
          const parsed = PropertyBinding.parseTrackName(track.name);
          const targets: Object3D[] = [];
          equipment.traverse((node) => {
            if (node.name === parsed.nodeName) targets.push(node);
          });
          if (
            targets.length !== 1 ||
            targets[0].userData.equipmentBone !== true ||
            !['position', 'quaternion', 'scale'].includes(parsed.propertyName) ||
            parsed.objectName ||
            parsed.propertyIndex
          )
            throw new Error(`Equipment animation has an unsupported target: ${track.name}`);
          const copy = track.clone();
          copy.name = `${bindBone(targets[0]).uuid}.${parsed.propertyName}`;
          return copy;
        })
      )
  );
  const initialClip = defaultEquipmentClip(animations.map((clip) => clip.name));
  const result = new EquipmentGroup();
  for (const { bone, parent } of attachments) {
    parent.add(bone);
    result.attachedRoots.push(bone);
    bone.updateWorldMatrix(true, true);
  }
  for (const [index, mesh] of meshes.entries()) {
    mesh.bind(bindings[index], mesh.bindMatrix.clone());
    // Keep identity mesh transforms. Joint world matrices already include the
    // converter's single Z-up-centimeters to Y-up-meters transformation.
    result.add(mesh);
    mesh.frustumCulled = false;
  }
  if (animations.length) {
    let root: Object3D = attachments[0].parent;
    while (root.parent) root = root.parent;
    result.mixer = new AnimationMixer(root);
    result.clips = animations;
    result.current = initialClip!;
    result.mixer.clipAction(animations.find((clip) => clip.name === initialClip)!).play();
  }
  return result;
}
