import { describe, expect, it } from 'vitest';
import {
  Bone,
  AnimationClip,
  NumberKeyframeTrack,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  MeshBasicMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3
} from 'three';
import {
  captureBodySkeleton,
  shareSkeleton,
  releaseEquipmentBones,
  equipmentMixers,
  equipmentAnimationControls
} from '../src/lib/outfits/sharedSkeleton';

function fixture() {
  const root = new Group();
  const bone = new Bone();
  bone.name = 'sanitized';
  bone.userData.name = 'SATA9NI_Bone01';
  bone.position.set(0, 2, 0);
  root.add(bone);
  root.updateMatrixWorld(true);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([1, 0, 0], 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute([0, 0, 0, 0], 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0], 4));
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial());
  mesh.bind(new Skeleton([bone], [new Matrix4().makeTranslation(0, -2, 0)]), new Matrix4());
  root.add(mesh);
  return { root, bone, mesh };
}

describe('shared equipment skeleton', () => {
  it('animates only the owned joint, supports seeking, and releases its mixer', () => {
    const body = fixture(),
      gear = fixture();
    const joint = new Bone();
    joint.name = 'wing';
    joint.userData.equipmentBone = true;
    gear.bone.add(joint);
    const wrong = new Bone();
    wrong.name = 'wing';
    body.bone.add(wrong);
    const clip = new AnimationClip('idle', 2, [
      new NumberKeyframeTrack('wing.position', [0, 2], [0, 0, 0, 2, 0, 0])
    ]);
    const shared = shareSkeleton(gear.root, captureBodySkeleton(body.root), [clip]);
    const [mixer] = equipmentMixers(shared);
    mixer.setTime(1);
    const animated = body.bone.children.find((b) => b !== wrong)!;
    expect(animated.position.x).toBeCloseTo(1);
    expect(wrong.position.x).toBe(0);
    mixer.setTime(0.5);
    expect(animated.position.x).toBeCloseTo(0.5);
    releaseEquipmentBones(shared);
    expect(animated.parent).toBeNull();
    expect(equipmentMixers(shared)).toHaveLength(0);
  });
  it('selects source idle and switches only that equipment instance to its attack clip', () => {
    const body = fixture(),
      gear = fixture();
    const joint = new Bone();
    joint.name = 'wing';
    joint.userData.equipmentBone = true;
    gear.bone.add(joint);
    const idle = new AnimationClip('Idle_A', 2, [
      new NumberKeyframeTrack('wing.position', [0, 2], [0, 0, 0, 2, 0, 0])
    ]);
    const attack = new AnimationClip('Attack_Idle_A', 2, [
      new NumberKeyframeTrack('wing.position', [0, 2], [0, 0, 0, 4, 0, 0])
    ]);
    const shared = shareSkeleton(gear.root, captureBodySkeleton(body.root), [attack, idle]);
    const [control] = equipmentAnimationControls(shared),
      [mixer] = equipmentMixers(shared);
    expect(control.current).toBe('Idle_A');
    mixer.setTime(1);
    expect(body.bone.children[0].position.x).toBeCloseTo(1);
    control.set('Attack_Idle_A');
    mixer.setTime(1);
    expect(control.current).toBe('Attack_Idle_A');
    expect(body.bone.children[0].position.x).toBeCloseTo(2);
    expect(body.bone.position.x).toBe(0);
    expect(() => control.set('Missing')).toThrow('Unknown');
    releaseEquipmentBones(shared);
    expect(body.bone.children).toHaveLength(0);
  });
  it('rejects an equipment track aimed at the body before changing bindings', () => {
    const body = fixture(),
      gear = fixture();
    const clip = new AnimationClip('bad', 1, [
      new NumberKeyframeTrack('sanitized.position', [0, 1], [0, 0, 0, 1, 0, 0])
    ]);
    expect(() => shareSkeleton(gear.root, captureBodySkeleton(body.root), [clip])).toThrow(
      'unsupported target'
    );
    expect(gear.mesh.skeleton.bones[0]).toBe(gear.bone);
    expect(body.bone.children).toHaveLength(0);
  });
  it('preserves private joints per instance, follows the attachment and releases only owned joints', () => {
    const body = fixture(),
      gear = fixture();
    const privateJoint = new Bone();
    privateJoint.userData.name = 'MT_Heart';
    privateJoint.userData.equipmentBone = true;
    privateJoint.position.x = 3;
    gear.bone.add(privateJoint);
    gear.root.updateMatrixWorld(true);
    gear.mesh.bind(
      new Skeleton([privateJoint], [new Matrix4().makeTranslation(-3, -2, 0)]),
      new Matrix4()
    );
    const skeleton = captureBodySkeleton(body.root);
    const group = shareSkeleton(gear.root, skeleton);
    const bound = gear.mesh.skeleton.bones[0];
    expect(bound).not.toBe(privateJoint);
    expect(bound.parent).toBe(body.bone);
    body.bone.position.x = 4;
    body.root.updateMatrixWorld(true);
    expect(gear.mesh.getVertexPosition(0, new Vector3()).toArray()).toEqual([5, 0, 0]);
    releaseEquipmentBones(group);
    expect(bound.parent).toBeNull();
    expect(body.bone.parent).toBe(body.root);
  });
  it('does not attach private joints when another mesh has an invalid binding', () => {
    const body = fixture(),
      gear = fixture();
    gear.bone.userData.equipmentBone = true;
    expect(() => shareSkeleton(gear.root, captureBodySkeleton(body.root))).toThrow(
      'missing equipment bone'
    );
    expect(body.bone.children).toHaveLength(0);
    expect(gear.mesh.skeleton.bones[0]).toBe(gear.bone);
  });
  it('uses exact source names and follows the body without a second mixer', () => {
    const body = fixture(),
      gear = fixture();
    const skeleton = captureBodySkeleton(body.root);
    const group = shareSkeleton(gear.root, skeleton);
    expect(gear.mesh.skeleton.bones[0]).toBe(body.bone);
    expect(group.children).toEqual([gear.mesh]);
    body.bone.position.x = 3;
    body.root.updateMatrixWorld(true);
    expect(gear.mesh.getVertexPosition(0, new Vector3()).toArray()).toEqual([4, 0, 0]);
    expect(gear.bone.position.x).toBe(0);
  });
  it('rejects incompatible variants before rebinding any mesh', () => {
    const body = fixture(),
      gear = fixture();
    gear.bone.position.y = 4;
    expect(() => shareSkeleton(gear.root, captureBodySkeleton(body.root))).toThrow(
      'rest pose differs'
    );
    expect(gear.mesh.skeleton.bones[0]).toBe(gear.bone);
  });
  it('rejects missing and duplicate exact names', () => {
    const body = fixture(),
      gear = fixture();
    gear.bone.userData.name = 'Bip01 Head';
    expect(() => shareSkeleton(gear.root, captureBodySkeleton(body.root))).toThrow(
      'missing equipment bone'
    );
    body.root.add(body.bone.clone());
    expect(() => captureBodySkeleton(body.root)).toThrow('duplicate bone');
  });
});
