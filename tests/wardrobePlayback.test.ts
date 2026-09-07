import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnimationMixer, Mesh, SkinnedMesh, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  captureBodySkeleton,
  equipmentMixers,
  releaseEquipmentBones,
  shareSkeleton
} from '../src/lib/outfits/sharedSkeleton';

const directory = process.env.WARDROBE_LIBRARY_DIR;
const manifest: { assets: { id: string; uri: string; bodyVariant: string; clips: string[] }[] } =
  directory
    ? JSON.parse(readFileSync(resolve(directory, 'native-manifest.json'), 'utf8'))
    : { assets: [] };
const catalog: { items: { itemId: number; bodyVariant: string; parts: { assetId: string }[] }[] } =
  directory
    ? JSON.parse(readFileSync(resolve(directory, 'simulator-catalog.json'), 'utf8'))
    : { items: [] };
async function load(path: string) {
  const data = JSON.parse(readFileSync(resolve(directory!, path), 'utf8')) as {
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
function release(root: Object3D) {
  releaseEquipmentBones(root);
  root.traverse((n) => {
    if (n instanceof Mesh) n.geometry.dispose();
  });
  root.clear();
}
describe.skipIf(!directory)('ordinary source animation playback', () => {
  beforeAll(() => vi.stubGlobal('ProgressEvent', class extends Event {}));
  afterAll(() => vi.unstubAllGlobals());
  for (const body of ['female', 'male'])
    for (const id of [11300506, 11800011]) {
      it(`${id}/${body} retains source joint deformation while the body runs`, async () => {
        const entry = catalog.items.find((i) => i.itemId === id && i.bodyVariant === body)!;
        expect(entry.parts).toHaveLength(1);
        const asset = manifest.assets.find((a) => a.id === entry.parts[0].assetId)!;
        expect(asset.clips).toHaveLength(1);
        const [player, item, reference] = await Promise.all([
          load(`${body}/body.gltf`),
          load(asset.uri),
          load(asset.uri)
        ]);
        const shared = shareSkeleton(
          item.scene,
          captureBodySkeleton(player.scene),
          item.animations
        );
        const bodyMixer = new AnimationMixer(player.scene),
          referenceMixer = new AnimationMixer(reference.scene);
        const clip = player.animations.find((c) => c.name === 'run_a')!;
        bodyMixer.clipAction(clip).play();
        referenceMixer.clipAction(clip).play();
        referenceMixer.clipAction(reference.animations[0]).play();
        const meshes: SkinnedMesh[] = [];
        reference.scene.traverse((n) => {
          if (n instanceof SkinnedMesh) meshes.push(n);
        });
        try {
          for (const time of [0, 0.3, 0.65, 1, 1.333333, 2]) {
            bodyMixer.setTime(time);
            referenceMixer.setTime(time);
            for (const mixer of equipmentMixers(shared)) mixer.setTime(time);
            player.scene.updateMatrixWorld(true);
            reference.scene.updateMatrixWorld(true);
            shared.updateMatrixWorld(true);
            for (const [index, node] of shared.children.entries()) {
              const mesh = node as SkinnedMesh;
              for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += 17) {
                const distance = mesh
                  .getVertexPosition(vertex, new Vector3())
                  .distanceTo(meshes[index].getVertexPosition(vertex, new Vector3()));
                expect(distance, `t=${time} ${mesh.name}/${vertex}`).toBeLessThan(1e-5);
              }
            }
          }
        } finally {
          bodyMixer.stopAllAction();
          referenceMixer.stopAllAction();
          bodyMixer.uncacheRoot(player.scene);
          referenceMixer.uncacheRoot(reference.scene);
          release(shared);
          release(player.scene);
          release(item.scene);
          release(reference.scene);
        }
      });
    }
});
