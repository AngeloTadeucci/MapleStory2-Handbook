import { describe, expect, it, vi } from 'vitest';
import { Bone, Group, Skeleton, SkinnedMesh, Vector3 } from 'three';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { createHairPlacement, clientHairRotation } from '../src/lib/outfits/hairPlacement';

function fixture() {
  const head = new Bone();
  head.name = 'Bip01 Head';
  const root = new Bone();
  root.name = 'Point01';
  root.userData.equipmentBone = true;
  head.add(root);
  const child = new Bone();
  child.userData.equipmentBone = true;
  root.add(child);
  const mesh = new SkinnedMesh();
  mesh.skeleton = new Skeleton([child]);
  const group = new Group();
  group.add(mesh);
  const remember = vi.fn();
  const control = createHairPlacement(
    group,
    {
      source: 'hair',
      selfNode: 'Point01',
      targetNode: 'Bip01 Head',
      jointAngles: [],
      presets: [
        { position: [53.5778, -18.4662, -15.8204], rotation: [0, 0, 0] },
        { position: [38.3593, -15.3433, -25.7962], rotation: [0, 0, 90] }
      ]
    },
    'Hair placement',
    0,
    remember
  );
  return { root, head, control, remember };
}

describe('authored hair placement', () => {
  it('uses XYZ multiplication for mixed source angles', () => {
    const actual = new Vector3(2, 3, 5).applyQuaternion(clientHairRotation([30, 45, 60]));
    const expected = new Vector3(2, 3, 5)
      .applyAxisAngle(new Vector3(0, 0, 1), -Math.PI / 3)
      .applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 4)
      .applyAxisAngle(new Vector3(1, 0, 0), -Math.PI / 6);
    expect(actual.distanceTo(expected)).toBeLessThan(1e-12);
  });
  it('matches the client clockwise Euler axes', () => {
    const point = new Vector3(0, 1, 0).applyQuaternion(clientHairRotation([90, 0, 0]));
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(0);
    expect(point.z).toBeCloseTo(-1);
  });
  it('applies source coordinates and restores the selected preset after animation overwrites it', () => {
    const { root, control, remember } = fixture();
    expect(root.position.toArray()).toEqual([53.5778, -18.4662, -15.8204]);
    control.set(1);
    const rotation = root.quaternion.clone();
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    control.apply();
    expect(root.position.toArray()).toEqual([38.3593, -15.3433, -25.7962]);
    expect(root.quaternion.equals(rotation)).toBe(true);
    expect(remember).toHaveBeenLastCalledWith(1);
    control.reset();
    expect(control.value).toBe(0);
    expect(root.position.toArray()).toEqual([53.5778, -18.4662, -15.8204]);
    expect(() => control.set(99)).toThrow('Unknown hair placement');
  });
  it('does not move another attachment sharing the same bone name', () => {
    const first = fixture(),
      second = fixture();
    first.control.set(1);
    expect(second.control.value).toBe(0);
    expect(second.root.position.toArray()).toEqual([53.5778, -18.4662, -15.8204]);
    expect(first.head.position.toArray()).toEqual([0, 0, 0]);
  });
});
