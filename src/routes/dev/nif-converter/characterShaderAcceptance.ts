import {
  AmbientLight,
  DirectionalLight,
  DataTexture,
  MeshStandardMaterial,
  FloatType,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {
  characterLightingFunctions,
  applyCharacterMaterials
} from '$lib/outfits/characterMaterials';

// Run from the existing Vite preview through T3. This evaluates the production
// GLSL on the GPU; the expected numbers are independent hand-calculated samples.
export function verifyCharacterShader() {
  const samples = [
    ['back diffuse', 'ms2HalfLambert(-1.0)', 0],
    ['side diffuse', 'ms2HalfLambert(0.0)', 0.25],
    ['front diffuse', 'ms2HalfLambert(1.0)', 1],
    ['front rim', 'ms2Rim(z, z, -z, 5.0, 4.0)', 0],
    ['edge rim', 'ms2Rim(z, x, -z, 5.0, 4.0)', 5],
    ['opposite rim', 'ms2Rim(z, x, z, 5.0, 4.0)', 0],
    ['surface highlight', 'ms2SurfaceSpecular(z, h, 4.0)', 0.25],
    ['hair across strands', 'ms2HairSpecular(z, h, x, 4.0)', 0.625],
    ['hair along strands', 'ms2HairSpecular(z, h, y, 4.0)', 0.15625]
  ] as const;
  const renderer = new WebGLRenderer();
  const target = new WebGLRenderTarget(samples.length, 1, {
    type: FloatType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false
  });
  const material = new RawShaderMaterial({
    vertexShader:
      'precision highp float; attribute vec3 position; void main(){gl_Position=vec4(position,1.0);}',
    fragmentShader: `precision highp float;
${characterLightingFunctions}
void main() {
  vec3 x=vec3(1.0,0.0,0.0), y=vec3(0.0,1.0,0.0), z=vec3(0.0,0.0,1.0);
  vec3 h=normalize(y+z);
  float result=0.0;
  ${samples.map((sample, i) => `if(int(gl_FragCoord.x)==${i}) result=${sample[1]};`).join('\n')}
  gl_FragColor=vec4(result,0.0,0.0,1.0);
}`
  });
  const geometry = new PlaneGeometry(2, 2);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  try {
    renderer.setRenderTarget(target);
    renderer.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
    const pixels = new Float32Array(samples.length * 4);
    renderer.readRenderTargetPixels(target, 0, 0, samples.length, 1, pixels);
    return samples.map(([name, , expected], i) => {
      const actual = pixels[i * 4];
      if (
        !Number.isFinite(actual) ||
        Math.abs(actual - expected) > 0.0001 ||
        pixels[i * 4 + 3] !== 1
      )
        throw new Error(`${name}: expected ${expected}, got ${actual}`);
      return { name, expected, actual };
    });
  } finally {
    target.dispose();
    material.dispose();
    geometry.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

export async function verifyCharacterLightingPipeline() {
  const renderer = new WebGLRenderer();
  const target = new WebGLRenderTarget(1, 1, { type: FloatType, depthBuffer: false });
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  const geometry = new PlaneGeometry(2, 2);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  camera.position.z = 1;
  const results = [];
  try {
    for (const enabled of [false, true]) {
      const material = new MeshStandardMaterial({ map: texture });
      material.color.setRGB(0.2, 0.2, 0.2);
      material.userData = {
        nifShader: 'MS2CharacterMaterial',
        nifLighting: {
          ambient: [0.7, 0.7, 0.7],
          specular: [1, 1, 1],
          specularEnabled: enabled,
          power: 4,
          ColorBoost: 1,
          FresnelBoost: 5,
          FresnelExponent: 4
        }
      };
      const scene = new Scene();
      scene.add(new Mesh(geometry, material));
      const light = new DirectionalLight(0xffffff, Math.PI * 0.8);
      light.position.set(0, 0, 1);
      scene.add(new AmbientLight(0xffffff, Math.PI * 0.8), light);
      try {
        await applyCharacterMaterials({ scene } as unknown as GLTF);
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        const pixels = new Float32Array(4);
        renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
        // 0.8 * ambient0.7 + 0.8 * diffuse0.2, plus enabled source specular0.8.
        const expected = enabled ? 1.52 : 0.72;
        if (Math.abs(pixels[0] - expected) > 0.0001 || pixels[3] !== 1)
          throw new Error(
            `Lighting pipeline specular=${enabled}: expected ${expected}, got ${pixels[0]}`
          );
        results.push({ specularEnabled: enabled, expected, actual: pixels[0] });
      } finally {
        material.dispose();
      }
    }
    return results;
  } finally {
    texture.dispose();
    geometry.dispose();
    target.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
