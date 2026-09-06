import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnimationMixer, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { captureBodySkeleton, shareSkeleton, sourceName } from '../src/lib/outfits/sharedSkeleton';

const directory = process.env.NATIVE_ACCEPTANCE_DIR;
async function load(file: string) {
  const json = JSON.parse(readFileSync(resolve(directory!, file), 'utf8')) as {
    materials?: unknown[];
    textures?: unknown[];
    images?: unknown[];
    meshes: { primitives: { material?: number }[] }[];
  };
  // This numerical test does not create a DOM or GPU context. Material appearance
  // is checked in the browser; every geometry, joint and animation byte stays intact.
  delete json.materials;
  delete json.textures;
  delete json.images;
  for (const mesh of json.meshes)
    for (const primitive of mesh.primitives) delete primitive.material;
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}

describe.skipIf(!directory)('exported outfit acceptance assets', () => {
  beforeAll(() =>
    vi.stubGlobal(
      'ProgressEvent',
      class extends Event {
        constructor(type: string, init?: ProgressEventInit) {
          super(type);
          Object.assign(this, init);
        }
      }
    )
  );
  afterAll(() => vi.unstubAllGlobals());
  it('male clothing meets the body wrist seams through the fitting animation', async () => {
    const [body, gear] = await Promise.all([load('male/body.gltf'), load('male/top.gltf')]);
    const shared = shareSkeleton(gear.scene, captureBodySkeleton(body.scene));
    const meshes = new Map<string, SkinnedMesh>();
    body.scene.traverse((node) => {
      if (node instanceof SkinnedMesh) meshes.set(sourceName(node), node);
    });
    const torso = meshes.get('CL')!,
      hands = meshes.get('GL')!;
    const arm = shared.children.find((node) => sourceName(node) === 'CL_Skin') as SkinnedMesh;
    expect(arm).toBeDefined();
    const vertices = (mesh: SkinnedMesh) =>
      Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) =>
        mesh.getVertexPosition(i, new Vector3())
      );
    body.scene.updateMatrixWorld(true);
    shared.updateMatrixWorld(true);
    const torsoPoints = vertices(torso),
      handPoints = vertices(hands);
    // Derive the seam from the naked body's coincident arm/hand vertices.
    // No manually chosen wrist position, radius or scale is involved.
    const seam: number[] = [];
    for (const [index, point] of torsoPoints.entries()) {
      if (
        handPoints.some((hand) => point.distanceTo(hand) < 1e-6) &&
        !seam.some((other) => point.distanceTo(torsoPoints[other]) < 1e-6)
      )
        seam.push(index);
    }
    expect(seam).toHaveLength(16);
    const mixer = new AnimationMixer(body.scene);
    mixer.clipAction(body.animations.find((clip) => clip.name === 'fitting_idle_a')!).play();
    for (const time of [0, 0.3, 0.75]) {
      mixer.setTime(time);
      body.scene.updateMatrixWorld(true);
      shared.updateMatrixWorld(true);
      const points = vertices(arm);
      for (const index of seam) {
        const wrist = torso.getVertexPosition(index, new Vector3());
        expect(
          Math.min(...points.map((point) => point.distanceTo(wrist))),
          `wrist vertex ${index} at ${time}s`
        ).toBeLessThan(1e-5);
      }
    }
    mixer.stopAllAction();
  });
  for (const gender of ['female', 'male']) {
    for (const item of gender === 'male'
      ? ['hat', 'top', 'hr', 'ea', 'oh']
      : ['hat', 'top', 'mt']) {
      it(`${gender} ${item} shares actual joints and preserves animated deformation`, async () => {
        const [body, gear, independent] = await Promise.all([
          load(`${gender}/body.gltf`),
          load(`${gender}/${item}.gltf`),
          load(`${gender}/${item}.gltf`)
        ]);
        const skeleton = captureBodySkeleton(body.scene);
        const shared = shareSkeleton(gear.scene, skeleton);
        if (gender === 'female' && item === 'top') {
          expect(shared.children.map((mesh) => mesh.userData.name ?? mesh.name).sort()).toEqual([
            'CL',
            'CL_Skin'
          ]);
        }
        const referenceMeshes: SkinnedMesh[] = [];
        independent.scene.traverse((node) => {
          if (node instanceof SkinnedMesh) referenceMeshes.push(node);
        });
        const bodyMixer = new AnimationMixer(body.scene),
          gearMixer = new AnimationMixer(independent.scene);
        const clip = body.animations.find((animation) => animation.name === 'fitting_idle_a')!;
        expect(clip).toBeDefined();
        bodyMixer.clipAction(clip).play();
        gearMixer.clipAction(clip).play();
        for (const time of [0, 0.3, 0.75]) {
          bodyMixer.setTime(time);
          gearMixer.setTime(time);
          body.scene.updateMatrixWorld(true);
          independent.scene.updateMatrixWorld(true);
          shared.updateMatrixWorld(true);
          for (const [index, node] of shared.children.entries()) {
            const mesh = node as SkinnedMesh,
              reference = referenceMeshes[index];
            for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += 31) {
              const actual = mesh.getVertexPosition(vertex, new Vector3());
              const expected = reference.getVertexPosition(vertex, new Vector3());
              expect(actual.distanceTo(expected)).toBeLessThan(1e-5);
            }
          }
        }
        bodyMixer.stopAllAction();
        gearMixer.stopAllAction();
      });
    }
  }
});
