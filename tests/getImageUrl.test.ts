import { afterEach, expect, it, vi } from 'vitest';
const env = vi.hoisted(() => ({ PUBLIC_IMAGES_URL: undefined as string | undefined }));
vi.mock('$env/static/public', () => ({ PUBLIC_MODELS_URL: '/gltf/' }));
vi.mock('$env/dynamic/public', () => ({ env }));
import { getImageUrl } from '../src/lib/getImageUrl';

afterEach(() => {
  env.PUBLIC_IMAGES_URL = undefined;
});
it('preserves the existing asset base when no image base is configured', () => {
  expect(getImageUrl('/resource/icon.png')).toBe('/gltf/resource/icon.png');
});
it('serves local UI images independently of the model directory', () => {
  env.PUBLIC_IMAGES_URL = '/';
  expect(getImageUrl('/resource/icon.png')).toBe('/resource/icon.png');
});
it('supports a separate image origin with or without a trailing slash', () => {
  env.PUBLIC_IMAGES_URL = 'https://images.example';
  expect(getImageUrl('resource/icon.png')).toBe('https://images.example/resource/icon.png');
});
