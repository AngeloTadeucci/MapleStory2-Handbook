import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnimationMixer, Mesh, SkinnedMesh, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  captureBodySkeleton,
  shareSkeleton,
  equipmentMixers,
  equipmentAnimationControls,
  releaseEquipmentBones
} from '../src/lib/outfits/sharedSkeleton';

const directory = process.env.SIMULATOR_LIBRARY_DIR;
const manifest: { assets: { id: string; uri: string; bodyVariant: string; skeleton?: string }[] } =
  directory
    ? JSON.parse(readFileSync(resolve(directory, 'native-manifest.json'), 'utf8'))
    : { assets: [] };
const sourceCatalog: {
  items: {
    availability: string;
    parts: { assetId: string }[];
    handParts?: Record<string, string[]>;
    hairForms?: Record<string, string[]>;
    stowedParts?: string[];
  }[];
} = directory
  ? JSON.parse(readFileSync(resolve(directory, 'simulator-catalog.json'), 'utf8'))
  : { items: [] };
const availableAssets = new Set(
  sourceCatalog.items
    .filter((i) => i.availability !== 'unavailable')
    .flatMap((i) => [
      ...i.parts.map((p) => p.assetId),
      ...Object.values(i.handParts ?? {}).flat(),
      ...Object.values(i.hairForms ?? {}).flat(),
      ...(i.stowedParts ?? [])
    ])
);
async function load(file: string) {
  const data = JSON.parse(readFileSync(resolve(directory!, file), 'utf8')) as {
    materials?: unknown[];
    textures?: unknown[];
    images?: unknown[];
    meshes: { primitives: { material?: number }[] }[];
  };
  delete data.materials;
  delete data.textures;
  delete data.images;
  for (const mesh of data.meshes) for (const part of mesh.primitives) delete part.material;
  return new GLTFLoader().parseAsync(JSON.stringify(data), '');
}
const bodies = new Map<string, ReturnType<typeof load>>();
async function loadBody(body: string) {
  let pending = bodies.get(body);
  if (!pending) {
    pending = load(`${body}/body.gltf`);
    bodies.set(body, pending);
  }
  const original = await pending;
  return { scene: clone(original.scene), animations: original.animations };
}
function release(root: Object3D) {
  releaseEquipmentBones(root);
  root.traverse((node) => {
    if (node instanceof Mesh) node.geometry.dispose();
  });
  root.clear();
}
const firstAsset = Number(process.env.SIMULATOR_ASSET_START ?? 0);
const assetLimit = Number(process.env.SIMULATOR_ASSET_LIMIT ?? manifest.assets.length);

describe.skipIf(!directory)('candidate library body binding', () => {
  beforeAll(() => vi.stubGlobal('ProgressEvent', class extends Event {}));
  afterAll(() => vi.unstubAllGlobals());
  it('preserves the neon KF deformation on private joints while the body runs', async () => {
    const asset = manifest.assets.find((a) => a.id === '11820024-female-0');
    if (!asset) return;
    const [body, gear, reference] = await Promise.all([
      loadBody('female'),
      load(asset.uri),
      load(asset.uri)
    ]);
    if (!gear.animations.length) return;
    const shared = shareSkeleton(gear.scene, captureBodySkeleton(body.scene), gear.animations);
    const bodyMixer = new AnimationMixer(body.scene);
    const referenceMixer = new AnimationMixer(reference.scene);
    const run = body.animations.find((a) => a.name === 'run_a')!;
    bodyMixer.clipAction(run).play();
    referenceMixer.clipAction(run).play();
    referenceMixer.clipAction(reference.animations[0]).play();
    const meshes: SkinnedMesh[] = [];
    reference.scene.traverse((node) => {
      if (node instanceof SkinnedMesh) meshes.push(node);
    });
    for (const time of [0, 0.5, 1, 2, 3, 4]) {
      bodyMixer.setTime(time);
      for (const mixer of equipmentMixers(shared)) mixer.setTime(time);
      referenceMixer.setTime(time);
      body.scene.updateMatrixWorld(true);
      reference.scene.updateMatrixWorld(true);
      for (const [index, node] of shared.children.entries()) {
        const mesh = node as SkinnedMesh;
        for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += 17)
          expect(
            mesh
              .getVertexPosition(vertex, new Vector3())
              .distanceTo(meshes[index].getVertexPosition(vertex, new Vector3()))
          ).toBeLessThan(1e-5);
      }
    }
    releaseEquipmentBones(shared);
    expect(equipmentMixers(shared)).toHaveLength(0);
  });
  for (const asset of manifest.assets
    .filter((a) => a.skeleton)
    .slice(firstAsset, firstAsset + assetLimit)) {
    it(`${asset.id} preserves deformation on the selected body through idle and run`, async () => {
      const [body, gear, independent] = await Promise.all([
        loadBody(asset.bodyVariant),
        load(asset.uri),
        load(asset.uri)
      ]);
      const sourceClips = availableAssets.has(asset.id) ? gear.animations : [];
      const shared = shareSkeleton(gear.scene, captureBodySkeleton(body.scene), sourceClips);
      const reference: SkinnedMesh[] = [];
      independent.scene.traverse((node) => {
        if (node instanceof SkinnedMesh) reference.push(node);
      });
      for (const effectName of sourceClips.length ? sourceClips.map((c) => c.name) : [undefined]) {
        if (effectName)
          for (const control of equipmentAnimationControls(shared)) control.set(effectName);
        for (const name of ['fitting_idle_a', 'run_a']) {
          const clip = body.animations.find((c) => c.name === name)!;
          const bodyMixer = new AnimationMixer(body.scene),
            gearMixer = new AnimationMixer(independent.scene);
          bodyMixer.clipAction(clip).play();
          gearMixer.clipAction(clip).play();
          if (effectName)
            gearMixer.clipAction(independent.animations.find((c) => c.name === effectName)!).play();
          for (const time of [0, 0.3, 0.75]) {
            bodyMixer.setTime(time);
            gearMixer.setTime(time);
            for (const mixer of equipmentMixers(shared)) mixer.setTime(time);
            body.scene.updateMatrixWorld(true);
            independent.scene.updateMatrixWorld(true);
            shared.updateMatrixWorld(true);
            for (const [index, node] of shared.children.entries()) {
              const mesh = node as SkinnedMesh;
              for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += 17) {
                const actual = mesh.getVertexPosition(vertex, new Vector3());
                const distance = actual.distanceTo(
                  reference[index].getVertexPosition(vertex, new Vector3())
                );
                expect(
                  distance,
                  `${asset.id} ${name}/${time} ${mesh.name} vertex ${vertex}`
                ).toBeLessThan(1e-5);
              }
            }
          }
          bodyMixer.stopAllAction();
          gearMixer.stopAllAction();
          bodyMixer.uncacheRoot(body.scene);
          gearMixer.uncacheRoot(independent.scene);
        }
      }
      release(shared);
      release(body.scene);
      release(gear.scene);
      release(independent.scene);
    });
  }
});
