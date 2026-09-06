import { describe, expect, it } from 'vitest';
import {
  Bone,
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
import { captureBodySkeleton, shareSkeleton } from '../src/lib/outfits/sharedSkeleton';

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
