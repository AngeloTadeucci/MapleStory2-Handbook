import { AmbientLight, Box3, DirectionalLight, Mesh, Object3D, Scene, Vector3 } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { applyCharacterMaterials } from '$lib/outfits/characterMaterials';
import { loadColorControls } from '$lib/outfits/materialColors';

export function addModelLighting(scene: Scene): void {
  scene.add(new AmbientLight(0xffffff, Math.PI * 0.8));
  const light = new DirectionalLight(0xffffff, Math.PI * 0.8);
  light.position.set(3, 5, 4);
  scene.add(light);
}

export async function prepareModelMaterials(gltf: GLTF) {
  await applyCharacterMaterials(gltf);
  return loadColorControls(gltf);
}

// Skeleton helper nodes can extend far beyond the visible equipment.
export function visibleModelBounds(root: Object3D): Box3 {
  root.updateMatrixWorld(true);
  const bounds = new Box3();
  const point = new Vector3();
  root.traverseVisible((node) => {
    if (!(node instanceof Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (materials.every((material) => !material.visible)) return;
    const position = node.geometry.getAttribute('position');
    if (!position) return;
    for (let index = 0; index < position.count; index++) {
      node.getVertexPosition(index, point).applyMatrix4(node.matrixWorld);
      bounds.expandByPoint(point);
    }
  });
  return bounds;
}
