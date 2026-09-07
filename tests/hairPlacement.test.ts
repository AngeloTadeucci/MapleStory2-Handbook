import { describe, expect, it, vi } from 'vitest';
import { Bone, Group, Skeleton, SkinnedMesh, Vector3 } from 'three';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import {
  createHairPlacement,
  clientHairRotation,
  hairPlacementSource
} from '../src/lib/outfits/hairPlacement';
import { parseNativeManifest } from '../src/lib/nativeAssets';

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
  it('keeps distinct XML placements when two KFM identities reference the same NIF', () => {
    const assets = parseNativeManifest(
      {
        version: 1,
        coordinateSystem: 'gltf-y-up-meters',
        assets: ['00200010_F_PiPi_P_A', '00200010_F_PiPi_P2_A'].map((name) => ({
          id: name,
          input: 'Item/0/02/00200010_f_pipi_p_a.nif',
          attachmentSource: `Item/0/02/${name}.kfm`,
          uri: `${name}.gltf`,
          clips: []
        }))
      },
      'http://localhost/native-manifest.json'
    );
    const first = hairPlacementSource(10200010, assets[0]);
    const second = hairPlacementSource(10200010, assets[1]);
    expect(first?.presets[0].position).toEqual([55.85, -4.04907, -18.9015]);
    expect(second?.presets[0].position).toEqual([54.6429, -4.64381, 21.3994]);
    expect(first).not.toBe(second);
    const { attachmentSource: _source, ...legacy } = assets[0];
    expect(hairPlacementSource(10200010, legacy)).toBe(first);
    expect(
      hairPlacementSource(10200010, { ...assets[1], attachmentSource: 'unknown.kfm' })
    ).toBeUndefined();
  });
  it('scales the attachment uniformly and preserves size through placement and animation', () => {
    const { root, head, control } = fixture();
    control.setScale(0.8);
    control.set(1);
    root.scale.setScalar(1);
    control.apply();
    expect(root.scale.toArray()).toEqual([0.8, 0.8, 0.8]);
    expect(head.scale.toArray()).toEqual([1, 1, 1]);
    control.reset();
    expect(control.scale).toBe(0.8);
    expect(() => control.setScale(NaN)).toThrow();
    expect(control.scale).toBe(0.8);
  });
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
