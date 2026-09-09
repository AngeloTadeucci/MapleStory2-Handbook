import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnimationMixer, Bone, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { animationLabel } from '../src/lib/outfits/characterAnimations';

const directory = process.env.CHARACTER_ANIMATION_DIR;
describe.skipIf(!directory)('exported character animations', () => {
  beforeAll(() => vi.stubGlobal('ProgressEvent', class extends Event {}));
  afterAll(() => vi.unstubAllGlobals());
  for (const variant of ['female', 'male']) {
    it(`${variant}: all 40 named clips animate the skeleton and deform finite vertices`, async () => {
      const json = JSON.parse(readFileSync(resolve(directory!, variant, 'body.gltf'), 'utf8')) as {
        materials?: unknown[];
        textures?: unknown[];
        images?: unknown[];
        meshes: { primitives: { material?: number }[] }[];
      };
      delete json.materials;
      delete json.textures;
      delete json.images;
      for (const mesh of json.meshes)
        for (const primitive of mesh.primitives) delete primitive.material;
      const body = await new GLTFLoader().parseAsync(JSON.stringify(json), '');
      const mixer = new AnimationMixer(body.scene);
      expect(body.animations).toHaveLength(40);
      expect(new Set(body.animations.map((clip) => clip.name)).size).toBe(40);
      for (const clip of body.animations) {
        expect(clip.duration, clip.name).toBeGreaterThan(0);
        expect(clip.tracks.length, clip.name).toBeGreaterThan(0);
        if (clip.name.startsWith('emotion_')) {
          expect(animationLabel(clip.name), clip.name).not.toMatch(/^(Emotion |Dance [a-z]$)/);
        }
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().play();
        const poses = [0.15, 0.65].map((fraction) => {
          mixer.setTime(clip.duration * fraction);
          body.scene.updateMatrixWorld(true);
          const transforms: number[] = [];
          body.scene.traverse((node) => {
            if (node instanceof Bone) transforms.push(...node.matrixWorld.elements);
            if (node instanceof SkinnedMesh) {
              for (let i = 0; i < node.geometry.attributes.position.count; i += 17) {
                const point = node.getVertexPosition(i, new Vector3());
                expect([point.x, point.y, point.z].every(Number.isFinite), clip.name).toBe(true);
              }
            }
          });
          return transforms;
        });
        expect(poses[0].length).toBeGreaterThan(0);
        expect(poses[0], clip.name).not.toEqual(poses[1]);
      }
    });
  }
});
