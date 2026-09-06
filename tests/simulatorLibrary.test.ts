import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnimationMixer, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { captureBodySkeleton, shareSkeleton } from '../src/lib/outfits/sharedSkeleton';

const directory = process.env.SIMULATOR_LIBRARY_DIR;
const manifest: { assets: { id: string; uri: string; bodyVariant: string; skeleton?: string }[] } =
  directory
    ? JSON.parse(readFileSync(resolve(directory, 'native-manifest.json'), 'utf8'))
    : { assets: [] };
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
describe.skipIf(!directory)('candidate library body binding', () => {
  beforeAll(() => vi.stubGlobal('ProgressEvent', class extends Event {}));
  afterAll(() => vi.unstubAllGlobals());
  for (const asset of manifest.assets.filter((a) => a.skeleton)) {
    it(`${asset.id} preserves deformation on the selected body through idle and run`, async () => {
      const [body, gear, independent] = await Promise.all([
        load(`${asset.bodyVariant}/body.gltf`),
        load(asset.uri),
        load(asset.uri)
      ]);
      const shared = shareSkeleton(gear.scene, captureBodySkeleton(body.scene));
      const reference: SkinnedMesh[] = [];
      independent.scene.traverse((node) => {
        if (node instanceof SkinnedMesh) reference.push(node);
      });
      for (const name of ['fitting_idle_a', 'run_a']) {
        const clip = body.animations.find((c) => c.name === name)!;
        const bodyMixer = new AnimationMixer(body.scene),
          gearMixer = new AnimationMixer(independent.scene);
        bodyMixer.clipAction(clip).play();
        gearMixer.clipAction(clip).play();
        for (const time of [0, 0.3, 0.75]) {
          bodyMixer.setTime(time);
          gearMixer.setTime(time);
          body.scene.updateMatrixWorld(true);
          independent.scene.updateMatrixWorld(true);
          shared.updateMatrixWorld(true);
          for (const [index, node] of shared.children.entries()) {
            const mesh = node as SkinnedMesh;
            for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += 17) {
              const actual = mesh.getVertexPosition(vertex, new Vector3());
              expect(
                actual.distanceTo(reference[index].getVertexPosition(vertex, new Vector3()))
              ).toBeLessThan(1e-5);
            }
          }
        }
        bodyMixer.stopAllAction();
        gearMixer.stopAllAction();
      }
    });
  }
});
