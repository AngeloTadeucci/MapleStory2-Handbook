import type { Camera, Scene, WebGLRenderer } from 'three';

export function transparentScreenshot(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera
): string {
  const background = scene.background;
  const alpha = renderer.getClearAlpha();
  try {
    scene.background = null;
    renderer.setClearAlpha(0);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  } finally {
    scene.background = background;
    renderer.setClearAlpha(alpha);
    renderer.render(scene, camera);
  }
}
