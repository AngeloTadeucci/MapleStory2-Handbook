import { expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { characterPreviewBase } from '../src/lib/outfits/catalog';
import { characterPreviewSchema } from '../src/lib/outfits/characterPreview';

it('keeps local character libraries inside their dedicated directory', () => {
  expect(characterPreviewBase('gelo-01')).toBe('/gltf/character-previews/gelo-01/');
  for (const name of ['../simulator-release-02', 'https://example.com', '', 'a/b'])
    expect(() => characterPreviewBase(name)).toThrow('Invalid local');
});

it('preserves exact normalized DB colors and rejects malformed character appearance', () => {
  const colors = [
    [242 / 255, 137 / 255, 186 / 255],
    [0, 0, 0],
    [155 / 255, 89 / 255, 104 / 255]
  ];
  const preset = {
    version: 1,
    name: 'Gelo',
    body: 'female',
    skin: colors,
    items: [{ id: 10200124, colors, hairLengths: [1, 1] }],
    omitted: []
  };
  expect(characterPreviewSchema.parse(preset).items[0].colors).toEqual(colors);
  expect(characterPreviewSchema.safeParse({ ...preset, skin: [[242, 137, 186]] }).success).toBe(
    false
  );
  expect(characterPreviewSchema.safeParse({ ...preset, items: [{ id: -1 }] }).success).toBe(false);
});
