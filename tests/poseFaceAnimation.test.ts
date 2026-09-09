import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { FaceAnimation, type FacePreset } from '../src/lib/outfits/faceAnimation';

const frame = (name: string, duration = 140) => ({
  image: `item_face/${name}.json`,
  mask: null,
  duration
});
const preset: FacePreset = {
  code: 'test',
  sequences: {
    default: { frames: [frame('idle')], repeat: true, sourceAnimation: null },
    happy: { frames: [frame('happy'), frame('happy2')], repeat: false, sourceAnimation: null }
  },
  poseExpressions: {
    emotion_dance_f: {
      frames: [frame('spin1'), frame('spin2'), frame('spin3')],
      repeat: true,
      sourceAnimation: 'Emotion_Dance_F'
    }
  }
};
afterEach(() => vi.unstubAllGlobals());
it('pairs the authored face frames with pose time across pauses, loops, overrides and fallback', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        width: 1,
        height: 1,
        rgba: btoa(String.fromCharCode(255, 255, 255, 255))
      })
    }))
  );
  const face = await FaceAnimation.load(
    preset,
    [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ],
    '/'
  );
  const material = new MeshStandardMaterial();
  const mesh = new Mesh(new PlaneGeometry(), material);
  mesh.name = 'FA';
  face.attach(mesh);
  const idle = material.map;
  face.selectClip('emotion_dance_f', 0);
  const first = material.map;
  expect(first).not.toBe(idle);
  face.update(0, 0.15);
  const second = material.map;
  expect(second).not.toBe(first);
  face.update(10, 0.15);
  expect(material.map).toBe(second); // Body paused; wall time must not advance its face.
  face.update(0, 0.29);
  expect(material.map).not.toBe(second);
  expect(material.map).not.toBe(first);
  face.update(0, 0.42);
  expect(material.map).toBe(first);
  face.select('happy');
  const happy = material.map;
  face.update(0, 0.15);
  expect(material.map).toBe(happy);
  face.seek(0.15);
  expect(material.map).not.toBe(happy);
  expect(face.currentTime).toBe(0.15);
  face.seek(0);
  expect(material.map).toBe(happy);
  face.select('auto');
  face.selectClip('emotion_dance_f', 0.15);
  expect(material.map).toBe(second);
  face.selectClip('walk_a', 0);
  expect(material.map).toBe(idle);
  face.dispose();
  mesh.geometry.dispose();
  material.dispose();
});
