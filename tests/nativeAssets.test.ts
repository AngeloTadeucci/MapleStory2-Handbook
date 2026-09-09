import { describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: true }));
vi.mock('$lib/getGltfUrl', () => ({ default: () => '/gltf/' }));
import { parseNativeManifest, selectNativeAsset } from '../src/lib/nativeAssets';

function manifest(uri = 'female/body.gltf') {
  return {
    version: 1,
    coordinateSystem: 'gltf-y-up-meters',
    assets: [
      {
        id: 'f_body',
        input: 'Models/Character/female/f_body.nif',
        uri,
        clips: ['Idle_A', 'Walk_A'],
        bodyVariant: 'female'
      }
    ]
  };
}

describe('native manifest contract', () => {
  it('resolves an explicit canonical alias across body and attachment variants', () => {
    const base = manifest().assets[0];
    const assets = parseNativeManifest(
      {
        ...manifest(),
        assets: [
          { ...base, id: 'female-placement', model: 'shared-model', standalone: false },
          {
            ...base,
            id: 'male-placement',
            model: 'shared-model',
            standalone: true,
            facePreset: '10300001',
            customizationUri: 'customization.json',
            clipMetadata: [{ name: 'Idle_A', duration: 2.5 }]
          }
        ]
      },
      'https://example.test/models/native-manifest.json'
    );
    expect(selectNativeAsset(assets, 'SHARED-MODEL')).toBe(assets[1]);
    expect(assets[1].customizationUrl).toBe('https://example.test/models/customization.json');
    expect(assets[1].clipMetadata).toEqual([{ name: 'Idle_A', duration: 2.5 }]);
    expect(selectNativeAsset([...assets, assets[1]], 'shared-model')).toBeUndefined();
  });
  it('resolves paths relative to the manifest and preserves clip case', () => {
    const assets = parseNativeManifest(
      manifest(),
      'https://example.test/models/native-manifest.json'
    );
    expect(assets[0].url).toBe('https://example.test/models/female/body.gltf');
    expect(assets[0].clips).toEqual(['Idle_A', 'Walk_A']);
    expect(selectNativeAsset(assets, 'F_BODY')).toBe(assets[0]);
    expect(selectNativeAsset([...assets, ...assets], 'f_body')).toBeUndefined();
  });
  it.each(['../body.gltf', '/body.gltf', 'https://elsewhere.test/body.gltf', 'folder\\body.gltf'])(
    'rejects a nonportable path %s',
    (uri) => {
      expect(() =>
        parseNativeManifest(manifest(uri), 'https://example.test/models/manifest.json')
      ).toThrow();
    }
  );
  it('rejects an unknown format or coordinate convention', () => {
    expect(() =>
      parseNativeManifest({ ...manifest(), version: 2 }, 'https://example.test/manifest.json')
    ).toThrow();
    expect(() =>
      parseNativeManifest(
        { ...manifest(), coordinateSystem: 'nif-z-up' },
        'https://example.test/manifest.json'
      )
    ).toThrow();
  });
});
