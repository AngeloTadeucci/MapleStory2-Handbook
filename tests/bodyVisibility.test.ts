import { describe, expect, it } from 'vitest';
import { hidesBodyPart } from '../src/lib/outfits/bodyVisibility';
import type { NativeAsset } from '../src/lib/nativeAssets';

const hoodie: NativeAsset = {
  id: '11400158-female',
  input: 'hoodie.nif',
  uri: 'hoodie.gltf',
  url: 'http://localhost/hoodie.gltf',
  clips: [],
  attachment: {
    slot: 'CL',
    selfNode: 'CL',
    targetNode: 'CL',
    replace: true,
    cutting: ['PA_Belt', 'GL_Wrist']
  }
};
describe('clothing replacement', () => {
  it('replaces naked torso and underwear while keeping unrelated body parts', () => {
    for (const name of ['CL', 'CL_Skin', 'CL_Bra', 'PA_Belt', 'GL_Wrist'])
      expect(hidesBodyPart(name, [hoodie])).toBe(true);
    for (const name of ['CLavicle', 'GL', 'PA_Skin', 'FA_Skin'])
      expect(hidesBodyPart(name, [hoodie])).toBe(false);
  });
  it('restores the default parts when the clothing is removed', () => {
    for (const name of ['CL_Skin', 'CL_Bra', 'PA_Belt', 'GL_Wrist'])
      expect(hidesBodyPart(name, [])).toBe(false);
  });
});
