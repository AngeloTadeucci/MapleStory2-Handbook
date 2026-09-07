import { expect, it } from 'vitest';
import {
  Bone,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3
} from 'three';
import type { NativeAsset } from '../src/lib/nativeAssets';
import {
  fitMovableHat,
  hatPlacementSource,
  needsHatPlacement
} from '../src/lib/outfits/hatAttachment';

function fixture() {
  const head = new Bone();
  head.name = 'Bip01 Head';
  head.position.set(0, 80, 0);
  head.rotation.z = Math.PI / 2;
  head.updateMatrixWorld(true);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 10], 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0], 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0], 4));
  const mesh = new SkinnedMesh(geometry);
  mesh.bind(new Skeleton([head], [head.matrixWorld.clone().invert()]), new Matrix4());
  return { head, mesh };
}
it('uses authored head-local position and radian rotation, then follows head animation', () => {
  const { head, mesh } = fixture();
  fitMovableHat(mesh, { position: [50, 2, 3], rotation: [0, -Math.PI / 2, 0] }, new Group());
  expect(mesh.getVertexPosition(0, new Vector3()).toArray()).toEqual(expect.arrayContaining([3]));
  const origin = mesh.getVertexPosition(0, new Vector3());
  expect(origin.x).toBeCloseTo(-2);
  expect(origin.y).toBeCloseTo(130);
  expect(origin.z).toBeCloseTo(3);
  expect(mesh.getVertexPosition(1, new Vector3()).y).toBeCloseTo(140);
  head.position.y += 5;
  head.updateMatrixWorld(true);
  expect(mesh.getVertexPosition(0, new Vector3()).y).toBeCloseTo(135);
});
it('projects to nearest hair surface, includes morphs, and does not accumulate corrections', () => {
  const { head, mesh } = fixture();
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [-10, -10, 4, 10, -10, 4, 0, 10, 4, -10, -10, 8, 10, -10, 8, 0, 10, 8],
      3
    )
  );
  geometry.morphAttributes.position = [
    new Float32BufferAttribute(
      [-10, -10, 6, 10, -10, 6, 0, 10, 6, -10, -10, 10, 10, -10, 10, 0, 10, 10],
      3
    )
  ];
  const hair = new Mesh(geometry);
  head.add(hair);
  head.updateMatrixWorld(true);
  const placement = { position: [0, 0, 0], rotation: [0, 0, 0] };
  expect(fitMovableHat(mesh, placement, hair)).toBeCloseTo(392);
  expect(mesh.skeleton.boneInverses[0].elements[14]).toBeCloseTo(8);
  hair.morphTargetInfluences![0] = 1;
  expect(fitMovableHat(mesh, placement, hair)).toBeCloseTo(390);
  expect(mesh.skeleton.boneInverses[0].elements[14]).toBeCloseTo(10);
  fitMovableHat(mesh, placement, hair);
  expect(mesh.skeleton.boneInverses[0].elements[14]).toBeCloseTo(10);
});
it('retains the authored placement when the ray misses', () => {
  const { mesh } = fixture();
  const placement = hatPlacementSource(10200080)!;
  expect(placement.position).toEqual([57.312, 0.563721, 30.6735]);
  expect(fitMovableHat(mesh, placement, new Group())).toBe(Infinity);
  expect(new Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[0]).toArray()).toEqual(
    placement.position
  );
  expect(hatPlacementSource(10200213)!.rotation).toEqual([0.415399, -0.753385, -0.333627]);
  expect(hatPlacementSource(-1)).toBeUndefined();
});
it('limits compatibility to the diagnosed release and excludes fitted and private hats', () => {
  const asset = {
    id: 'wardrobe-fbb6ec3687b62815b3fb4de0',
    url: 'http://localhost/gltf/simulator-release-14/hat.gltf'
  } as NativeAsset;
  expect(needsHatPlacement(asset)).toBe(true);
  expect(needsHatPlacement({ ...asset, id: 'wardrobe-f5ce58f738334c90c520c2d7' })).toBe(true);
  expect(needsHatPlacement({ ...asset, id: '11320024-female-0' })).toBe(false);
  expect(needsHatPlacement({ ...asset, url: asset.url.replace('release-14', 'release-05') })).toBe(
    false
  );
  expect(
    needsHatPlacement({ ...asset, url: 'http://localhost/gltf/character-previews/gelo/hat.gltf' })
  ).toBe(false);
});
it('rejects unsupported skeletons without changing a binding', () => {
  const { head, mesh } = fixture();
  head.name = 'Bip01 Foot';
  const before = mesh.skeleton.boneInverses[0];
  expect(() =>
    fitMovableHat(mesh, { position: [0, 0, 0], rotation: [0, 0, 0] }, new Group())
  ).toThrow('single head');
  expect(mesh.skeleton.boneInverses[0]).toBe(before);
});
