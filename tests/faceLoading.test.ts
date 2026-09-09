import { afterEach, expect, it, vi } from 'vitest';
import { FaceAnimation, type FacePreset } from '../src/lib/outfits/faceAnimation';

const preset: FacePreset = {
  code: 'test',
  sequences: {
    idle: {
      frames: [
        { image: 'item_face/a.json', mask: 'item_face/mask.json', duration: 100 },
        { image: 'item_face/b.json', mask: 'item_face/mask.json', duration: 100 }
      ],
      repeat: true,
      sourceAnimation: null
    }
  },
  poseExpressions: {
    happy: {
      frames: [{ image: 'item_face/a.json', mask: 'item_face/mask.json', duration: 100 }],
      repeat: false,
      sourceAnimation: null
    }
  }
};
const colors: [number, number, number][] = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1]
];
afterEach(() => vi.unstubAllGlobals());

it('starts all unique face and mask requests before waiting for a response', async () => {
  const pending: ((response: Response) => void)[] = [];
  const fetcher = vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve)));
  vi.stubGlobal('fetch', fetcher);
  const loading = FaceAnimation.load(preset, colors, 'https://assets.example/');
  expect(fetcher.mock.calls).toHaveLength(3);
  for (const resolve of pending) resolve(Response.json({ width: 1, height: 1, rgba: '/wAA/w==' }));
  const face = await loading;
  expect(face.control.colors).toEqual(colors);
  face.select('idle');
  face.seek(0.15);
  face.dispose();
});

it('rejects failed image loads and allows a fresh attempt', async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 503 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(FaceAnimation.load(preset, colors, '/')).rejects.toThrow(
    'Face texture is unavailable'
  );
  fetcher.mockImplementation(async () => Response.json({ width: 1, height: 1, rgba: '/wAA/w==' }));
  const face = await FaceAnimation.load(preset, colors, '/');
  expect(fetcher).toHaveBeenCalledTimes(6);
  face.dispose();
});
