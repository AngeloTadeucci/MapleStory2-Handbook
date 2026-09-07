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
