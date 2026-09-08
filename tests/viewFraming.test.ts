import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { viewDistance } from '../src/lib/outfits/viewFraming';

describe('complete outfit framing', () => {
  it.each(['front', 'side', 'back'] as const)(
    'fits every corner including near-camera depth from %s',
    (angle) => {
      for (const size of [new Vector3(1, 2, 5), new Vector3(5, 2, 1), new Vector3(1, 5, 2)]) {
        for (const aspect of [0.6, 1.5]) {
          const camera = new PerspectiveCamera(40, aspect, 0.01, 100);
          const distance = viewDistance(size, aspect, camera.fov, angle);
          camera.position.copy(
            angle === 'side'
              ? new Vector3(distance, 0, 0)
              : new Vector3(0, 0, angle === 'back' ? -distance : distance)
          );
          camera.lookAt(0, 0, 0);
          camera.updateMatrixWorld(true);
          for (const x of [-1, 1])
            for (const y of [-1, 1])
              for (const z of [-1, 1]) {
                const corner = new Vector3(
                  (x * size.x) / 2,
                  (y * size.y) / 2,
                  (z * size.z) / 2
                ).project(camera);
                expect(Math.abs(corner.x)).toBeLessThan(1);
                expect(Math.abs(corner.y)).toBeLessThan(1);
                expect(corner.z).toBeGreaterThan(-1);
                expect(corner.z).toBeLessThan(1);
              }
        }
      }
    }
  );
});

it('fits narrow mobile bounds after arbitrary orbit rotations while retaining direction', async () => {
  const { orbitViewSize } = await import('../src/lib/outfits/viewFraming');
  const size = new Vector3(1, 2, 1.4);
  for (const direction of [new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(1, 0.4, -1)]) {
    direction.normalize();
    const projected = orbitViewSize(size, direction, new Vector3(0, 1, 0));
    const camera = new PerspectiveCamera(40, 0.45, 0.01, 100);
    camera.position
      .copy(direction)
      .multiplyScalar(viewDistance(projected, camera.aspect, camera.fov, 'front'));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    expect(camera.position.clone().normalize().distanceTo(direction)).toBeLessThan(1e-10);
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const corner = new Vector3((x * size.x) / 2, (y * size.y) / 2, (z * size.z) / 2).project(
            camera
          );
          expect(Math.abs(corner.x)).toBeLessThan(1);
          expect(Math.abs(corner.y)).toBeLessThan(1);
        }
  }
});

it('crops studio backgrounds without stretching them on portrait and wide canvases', async () => {
  const { backgroundCrop } = await import('../src/lib/outfits/viewFraming');
  for (const viewport of [0.45, 1, 1.7, 2.4]) {
    const crop = backgroundCrop(16 / 9, viewport);
    expect(((16 / 9) * crop.repeat[0]) / crop.repeat[1]).toBeCloseTo(viewport);
    expect(Math.max(...crop.repeat)).toBe(1);
    expect(crop.offset[0]).toBeCloseTo((1 - crop.repeat[0]) / 2);
    expect(crop.offset[1]).toBeCloseTo((1 - crop.repeat[1]) / 2);
  }
});
