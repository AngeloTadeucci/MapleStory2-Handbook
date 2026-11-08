import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import {
  backgrounds,
  backgroundName,
  backgroundThumbnailUrl,
  backgroundUrl,
  findBackground
} from '../src/lib/outfits/backgrounds';
import { decodeOutfit, encodeOutfit, type OutfitCode } from '../src/lib/outfits/outfitCode';

// Encoded by master's encodeOutfit at 039a273, when only these four backgrounds existed.
const masterCodes = {
  '': 'MS2O.eyJ2ZXJzaW9uIjoxLCJib2R5IjoiZmVtYWxlIiwiYm9keUNvbG9ycyI6W10sIml0ZW1zIjpbXSwiZXhwcmVzc2lvbiI6ImRlZmF1bHQiLCJiYWNrZ3JvdW5kIjoiIiwicG9zZSI6ImZpdHRpbmdfaWRsZV9hIiwicGxheWluZyI6dHJ1ZSwiZWZmZWN0cyI6dHJ1ZSwiYnJvd3Nlck1vdGlvbiI6ZmFsc2V9',
  blue: 'MS2O.eyJ2ZXJzaW9uIjoxLCJib2R5IjoiZmVtYWxlIiwiYm9keUNvbG9ycyI6W10sIml0ZW1zIjpbXSwiZXhwcmVzc2lvbiI6ImRlZmF1bHQiLCJiYWNrZ3JvdW5kIjoiYmx1ZSIsInBvc2UiOiJmaXR0aW5nX2lkbGVfYSIsInBsYXlpbmciOnRydWUsImVmZmVjdHMiOnRydWUsImJyb3dzZXJNb3Rpb24iOmZhbHNlfQ',
  henesys_a:
    'MS2O.eyJ2ZXJzaW9uIjoxLCJib2R5IjoiZmVtYWxlIiwiYm9keUNvbG9ycyI6W10sIml0ZW1zIjpbXSwiZXhwcmVzc2lvbiI6ImRlZmF1bHQiLCJiYWNrZ3JvdW5kIjoiaGVuZXN5c19hIiwicG9zZSI6ImZpdHRpbmdfaWRsZV9hIiwicGxheWluZyI6dHJ1ZSwiZWZmZWN0cyI6dHJ1ZSwiYnJvd3Nlck1vdGlvbiI6ZmFsc2V9',
  ellinia_a:
    'MS2O.eyJ2ZXJzaW9uIjoxLCJib2R5IjoiZmVtYWxlIiwiYm9keUNvbG9ycyI6W10sIml0ZW1zIjpbXSwiZXhwcmVzc2lvbiI6ImRlZmF1bHQiLCJiYWNrZ3JvdW5kIjoiZWxsaW5pYV9hIiwicG9zZSI6ImZpdHRpbmdfaWRsZV9hIiwicGxheWluZyI6dHJ1ZSwiZWZmZWN0cyI6dHJ1ZSwiYnJvd3Nlck1vdGlvbiI6ZmFsc2V9'
};
const code = (background: string): OutfitCode => ({
  version: 1,
  body: 'female',
  bodyColors: [],
  items: [],
  expression: 'default',
  background,
  pose: 'fitting_idle_a',
  playing: true,
  effects: true,
  browserMotion: false
});

describe('background outfit codes', () => {
  it.each(Object.entries(masterCodes))('decodes a master code with background %j', (id, value) => {
    expect(decodeOutfit(value).background).toBe(id);
    expect(encodeOutfit(code(id))).toBe(value);
  });
  it.each(['kritias_f', 'sw_bg_dark_a', 'fairy_tale', 'lith_ch_a'])('round-trips %s', (id) => {
    expect(decodeOutfit(encodeOutfit(code(id))).background).toBe(id);
  });
  it.each(['bg_blue', 'fairy tale', 'sw_dark_a', 'Henesys_A'])('rejects %j', (id) => {
    expect(() => encodeOutfit(code(id))).toThrow();
  });
});

describe('background table', () => {
  it('lists every client bg texture once', () => {
    expect(backgrounds).toHaveLength(131);
    expect(new Set(backgrounds.map((b) => b.id)).size).toBe(131);
    expect(new Set(backgrounds.map((b) => b.file)).size).toBe(131);
  });
  it('keeps the URLs master used for the original backgrounds', () => {
    expect(backgroundUrl('/gltf/', '')).toBeNull();
    for (const id of ['blue', 'henesys_a', 'ellinia_a'])
      expect(backgroundUrl('/gltf/', id)).toBe(`/gltf/backgrounds/bg/bg_${id}.png`);
  });
  it('maps shadow world and renamed textures to their published files', () => {
    expect(backgroundUrl('https://cdn/', 'sw_bg_dark_a')).toBe(
      'https://cdn/backgrounds/bg/sw_bg_dark_a.png'
    );
    expect(backgroundUrl('/gltf/', 'fairy_tale')).toBe('/gltf/backgrounds/bg/bg_fairy_tale.png');
    expect(backgroundThumbnailUrl('/gltf/', findBackground('kritias_f')!)).toBe(
      '/gltf/backgrounds/thumbs/bg_kritias_f.webp'
    );
    expect(() => backgroundUrl('/gltf/', 'nope')).toThrow();
  });
  it('names backgrounds for the picker', () => {
    expect(backgroundName('')).toBe('Studio');
    expect(backgroundName('henesys_a')).toBe('Henesys A');
    expect(backgroundName('blue')).toBe('Blue');
    expect(backgroundName('winter_ch')).toBe('Winter');
    expect(backgroundName('sw_bg_rudi_b')).toBe('Shadow World Ludibrium B');
  });
});
