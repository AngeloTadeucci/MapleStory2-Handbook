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
