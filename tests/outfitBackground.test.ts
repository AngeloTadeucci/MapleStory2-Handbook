import { beforeEach, expect, it, vi } from 'vitest';
import { Texture } from 'three';

const loads = vi.hoisted(
  () =>
    [] as { url: string; resolve: (texture: Texture) => void; reject: (cause: unknown) => void }[]
);
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class TextureLoader {
    loadAsync(url: string) {
      return new Promise<Texture>((resolve, reject) => loads.push({ url, resolve, reject }));
    }
  }
  return { ...actual, TextureLoader };
});
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { OutfitScene } from '../src/lib/outfits/OutfitScene';

function scene(previous = new Texture()) {
  const viewer = Object.create(OutfitScene.prototype) as OutfitScene;
  const state = {
    alive: true,
    backgroundRequest: 0,
    background: previous,
    scene: { background: previous },
    fitBackground: vi.fn()
  };
  Object.assign(viewer, state);
  return { viewer, state };
}

beforeEach(() => {
  loads.length = 0;
});

it('applies a loaded background and reports it', async () => {
  const { viewer, state } = scene();
  const pending = viewer.setBackground('/bg_blue.png');
  const texture = new Texture();
  loads[0].resolve(texture);
  await expect(pending).resolves.toBe(true);
  expect(loads[0].url).toBe('/bg_blue.png');
  expect(state.scene.background).toBe(texture);
});

it('keeps the displayed background when the image fails to load', async () => {
  const previous = new Texture();
  const dispose = vi.spyOn(previous, 'dispose');
  const { viewer, state } = scene(previous);
  const pending = viewer.setBackground('/missing.png');
  loads[0].reject(new Event('error'));
  await expect(pending).resolves.toBe(false);
  expect(state.scene.background).toBe(previous);
  expect(dispose).not.toHaveBeenCalled();
});

it('discards a load that a newer call superseded', async () => {
  const { viewer, state } = scene();
  const older = viewer.setBackground('/bg_blue.png');
  const newer = viewer.setBackground('/bg_henesys_a.png');
  const newerTexture = new Texture();
  loads[1].resolve(newerTexture);
  await expect(newer).resolves.toBe(true);
  const olderTexture = new Texture();
  const dispose = vi.spyOn(olderTexture, 'dispose');
  loads[0].resolve(olderTexture);
  await expect(older).resolves.toBe(false);
  expect(dispose).toHaveBeenCalled();
  expect(state.scene.background).toBe(newerTexture);
});

it('discards a load that finishes after the scene was destroyed', async () => {
  const previous = new Texture();
  const { viewer, state } = scene(previous);
  const pending = viewer.setBackground(null);
  Object.assign(viewer, { alive: false });
  const texture = new Texture();
  const dispose = vi.spyOn(texture, 'dispose');
  loads[0].resolve(texture);
  await expect(pending).resolves.toBe(false);
  expect(dispose).toHaveBeenCalled();
  expect(state.scene.background).toBe(previous);
});
