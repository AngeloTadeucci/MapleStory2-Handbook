import { expect, it, vi } from 'vitest';
import { Group, Mesh } from 'three';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { OutfitScene } from '../src/lib/outfits/OutfitScene';

it('imports both saved channels by client target name, including fixed and hidden picker channels', () => {
  const group = new Group();
  const meshes = ['HR1:1', 'HR0:0', 'Face'].map((name) => {
    const mesh = new Mesh();
    mesh.name = name;
    mesh.morphTargetInfluences = [0.5];
    group.add(mesh);
    return mesh;
  });
  const lengths = new Map<string, number>();
  const scale = vi.fn();
  const scene = Object.create(OutfitScene.prototype) as OutfitScene;
  Object.assign(scene, {
    bundles: new Map([['hair', { slots: ['HR'], item: { id: 10200213 } }]]),
    equipment: new Map([['hair', group]]),
    hairLengths: lengths,
    hairPlacements: new Map([['hair', [{ label: 'Tail', setScale: scale }]]])
  });
  expect(scene.setHairLengths([1, 0.37])).toEqual([
    { target: 'HR1:1', index: 1, value: 0.37 },
    { target: 'HR0:0', index: 0, value: 1 },
    { target: 'Tail', index: 0, value: 1 }
  ]);
  expect(meshes.map((mesh) => mesh.morphTargetInfluences![0])).toEqual([0.37, 1, 0.5]);
  expect(lengths.get('10200213:0')).toBe(1);
  expect(lengths.get('10200213:1')).toBe(0.37);
  expect(scale).toHaveBeenCalledWith(1);
  expect(() => scene.setHairLengths([0.6, NaN])).toThrow();
  expect(meshes.map((mesh) => mesh.morphTargetInfluences![0])).toEqual([0.37, 1, 0.5]);
});

it('exposes source ranges for each morph channel only when scale customization is enabled', () => {
  const group = new Group();
  for (const name of ['HR1:1', 'HR0:0']) {
    const mesh = new Mesh();
    mesh.name = name;
    mesh.morphTargetInfluences = [0.5];
    group.add(mesh);
  }
  const library = { hairScales: [[0.3, 0.5, 0.9], [1]], customize: { scale: '1' } };
  const scene = Object.create(OutfitScene.prototype) as OutfitScene;
  Object.assign(scene, {
    bundles: new Map([['hair', { slots: ['HR'], item: { id: 10200213, name: 'Hair', library } }]]),
    equipment: new Map([['hair', group]]),
    hairLengths: new Map(),
    hairPlacements: new Map()
  });
  const controls = scene.hairControls;
  expect(controls.map(({ label, range }) => ({ label, range }))).toEqual([
    { label: 'Hair length 2', range: { min: 0, max: 1 } },
    { label: 'Hair length 1', range: { min: 0, max: 1 } }
  ]);
  controls[0].set(0.37);
  expect((group.children[0] as Mesh).morphTargetInfluences).toEqual([0.37]);
  library.customize.scale = '0';
  expect(scene.hairControls).toEqual([]);
  scene.setHairLengths([1, 0.6]);
  expect((group.children[0] as Mesh).morphTargetInfluences).toEqual([0.6]);
});

it('applies a continuous tail size to both attachments and restores their size default', () => {
  const placements = [
    { scale: 1, setScale: vi.fn() },
    { scale: 1, setScale: vi.fn() }
  ];
  const scene = Object.create(OutfitScene.prototype) as OutfitScene;
  const lengths = new Map();
  Object.assign(scene, {
    bundles: new Map([
      [
        'hair',
        {
          slots: ['HR'],
          item: {
            id: 10200008,
            name: 'Flower',
            library: {
              hairScales: [[0.8, 1, 1.2]],
              customize: { scale: '1' }
            }
          }
        }
      ]
    ]),
    equipment: new Map(),
    hairLengths: lengths,
    hairPlacements: new Map([['hair', placements]])
  });
  const control = scene.hairControls[0];
  expect(control.range).toEqual({ min: 0.8, max: 1.2 });
  control.set(1.1);
  for (const placement of placements) expect(placement.setScale).toHaveBeenLastCalledWith(1.1);
  expect(lengths.get('10200008:attachment')).toBe(1.1);
  expect(() => control.set(1.21)).toThrow('Unsupported hair size');
  control.reset();
  for (const placement of placements) expect(placement.setScale).toHaveBeenLastCalledWith(1);
});
