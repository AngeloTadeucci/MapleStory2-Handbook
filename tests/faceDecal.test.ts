import { expect, it } from 'vitest';
import { decalSchema, decalUv } from '../src/lib/outfits/faceDecal';

it('maps saved Rosy Pink Blush coordinates using the client skin shader transform', () => {
  const transform: [number, number, number, number] = [0.25, 0.01, 0, 0.52];
  expect(decalUv(0.75, 0.51, transform)[0]).toBeCloseTo(0.5);
  expect(decalUv(0.75, 0.51, transform)[1]).toBeCloseTo(0.5);
  expect(decalUv(0.88, 0.51, transform)[0]).toBeCloseTo(1);
  expect(decalUv(0.75, 0.77, transform)[1]).toBeCloseTo(1);
  expect(decalUv(0.88, 0.51, [0.25, 0.01, Math.PI / 2, 0.52])[1]).toBeCloseTo(0);
});

it('rejects invalid decal scales and paths', () => {
  for (const texture of [
    '../secret.png',
    'https://example.com/a.png',
    'makeup/item_makeup/a/../../b.png'
  ])
    expect(decalSchema.safeParse({ texture, transform: [0, 0, 0, 1] }).success).toBe(false);
  expect(
    decalSchema.safeParse({ texture: 'makeup/item_makeup/blush.png', transform: [0, 0, 0, 0] })
      .success
  ).toBe(false);
});

it('repoints cached shader uniforms when one makeup item replaces another', async () => {
  const { vi } = await import('vitest');
  const { FaceDecal } = await import('../src/lib/outfits/faceDecal');
  const { Group, Mesh, MeshStandardMaterial, Texture, TextureLoader } = await import('three');
  const loader = vi
    .spyOn(TextureLoader.prototype, 'loadAsync')
    .mockImplementation(async () => new Texture());
  const material = new MeshStandardMaterial({ map: new Texture() });
  const mesh = new Mesh(undefined, material);
  mesh.name = 'FA_Skin';
  const body = new Group();
  body.add(mesh);
  const data = {
    texture: 'makeup/item_makeup/heart.png',
    transform: [0.2, 0.02, 0, 0.1] as [number, number, number, number]
  };
  try {
    const first = await FaceDecal.load(data, '/', body, undefined, {
      translation: '1',
      rotation: '1'
    });
    first.attach();
    const shader = { uniforms: {}, fragmentShader: '#include <map_fragment>' } as Parameters<
      typeof material.onBeforeCompile
    >[0];
    material.onBeforeCompile(shader, {} as Parameters<typeof material.onBeforeCompile>[1]);
    const originalTexture = shader.uniforms.faceDecal.value;
    first.dispose();
    const second = await FaceDecal.load(
      { ...data, texture: 'makeup/item_makeup/star.png' },
      '/',
      body,
      undefined,
      { translation: '1', rotation: '1' }
    );
    second.attach();
    expect(shader.uniforms.faceDecal.value).not.toBe(originalTexture);
    second.controls.move(0.3, 0.1);
    second.controls.rotate(0.5);
    expect(shader.uniforms.faceDecalTransform.value.toArray()).toEqual([0.3, 0.1, 0.5, 0.1]);
    expect(() => second.controls.move(0.6, 0)).toThrow('outside');
    expect(() => second.controls.rotate(Infinity)).toThrow('outside');
    expect(second.controls.value).toEqual([0.3, 0.1, 0.5, 0.1]);
    second.controls.reset();
    expect(second.controls.value).toEqual(data.transform);
    second.dispose();
    const fixed = await FaceDecal.load(data, '/', body);
    expect(fixed.controls.movable).toBe(false);
    expect(() => fixed.controls.move(0.1, 0.1)).toThrow('fixed');
    expect(() => fixed.controls.rotate(0.1)).toThrow('fixed');
    fixed.dispose();
  } finally {
    loader.mockRestore();
    material.dispose();
  }
});

it('composites makeup before the character shader captures the ambient texel', async () => {
  const { vi } = await import('vitest');
  const { FaceDecal } = await import('../src/lib/outfits/faceDecal');
  const { applyCharacterMaterials } = await import('../src/lib/outfits/characterMaterials');
  const { Group, Mesh, MeshStandardMaterial, ShaderLib, Texture, TextureLoader } =
    await import('three');
  const loader = vi
    .spyOn(TextureLoader.prototype, 'loadAsync')
    .mockImplementation(async () => new Texture());
  const material = new MeshStandardMaterial({ map: new Texture() });
  material.userData = {
    nifShader: 'MS2CharacterSkinMaterial',
    nifLighting: { specularEnabled: false, specular: [0, 0, 0], power: 1 }
  };
  const mesh = new Mesh(undefined, material);
  mesh.name = 'FA_Skin';
  const scene = new Group();
  scene.add(mesh);
  try {
    await applyCharacterMaterials({
      scene
    } as unknown as import('three/addons/loaders/GLTFLoader.js').GLTF);
    const decal = await FaceDecal.load(
      { texture: 'makeup/item_makeup/heart.png', transform: [0.2, 0.02, 0, 0.1] },
      '/',
      scene
    );
    decal.attach();
    const shader = {
      uniforms: {},
      fragmentShader: ShaderLib.standard.fragmentShader
    } as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, {} as Parameters<typeof material.onBeforeCompile>[1]);
    const blend = shader.fragmentShader.indexOf('sampledDiffuseColor.rgb = mix(');
    const ambient = shader.fragmentShader.indexOf('ms2BaseTexel = sampledDiffuseColor.rgb;');
    expect(blend).toBeGreaterThan(-1);
    expect(ambient).toBeGreaterThan(blend);
    expect(shader.fragmentShader.slice(blend, ambient)).toContain('decalColor.a');
    expect(shader.fragmentShader.slice(blend, ambient)).toContain(
      'diffuseColor.rgb = diffuse * sampledDiffuseColor.rgb'
    );
    decal.dispose();
  } finally {
    loader.mockRestore();
    material.dispose();
  }
});
