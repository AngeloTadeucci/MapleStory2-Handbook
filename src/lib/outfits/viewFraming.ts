import { Vector3 } from 'three';

export function viewDistance(
  size: { x: number; y: number; z: number },
  aspect: number,
  verticalFov: number,
  angle: 'front' | 'side' | 'back'
) {
  const width = angle === 'side' ? size.z : size.x;
  const depth = angle === 'side' ? size.x : size.z;
  // Fit the nearest face of the bounds, including perspective depth.
  return (
    (Math.max(size.y, width / aspect) / (2 * Math.tan((verticalFov * Math.PI) / 360)) + depth / 2) *
    1.2
  );
}

// Project world-aligned bounds onto the current orbit axes without changing the
// viewing direction. Resize can then retain the user's zoom relative to a fit.
export function orbitViewSize(size: Vector3, direction: Vector3, up: Vector3) {
  const forward = direction.clone().normalize();
  const right = up.clone().cross(forward);
  if (right.lengthSq() < 1e-12) right.set(1, 0, 0);
  right.normalize();
  const vertical = forward.clone().cross(right).normalize();
  const extent = (axis: Vector3) =>
    Math.abs(axis.x) * size.x + Math.abs(axis.y) * size.y + Math.abs(axis.z) * size.z;
  return new Vector3(extent(right), extent(vertical), extent(forward));
}

export function backgroundCrop(imageAspect: number, viewportAspect: number) {
  const x = Math.min(1, viewportAspect / imageAspect);
  const y = Math.min(1, imageAspect / viewportAspect);
  return { repeat: [x, y] as const, offset: [(1 - x) / 2, (1 - y) / 2] as const };
}
