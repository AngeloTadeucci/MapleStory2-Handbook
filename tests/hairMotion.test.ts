import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { hairMotionSchema, sampleHairMotion } from '../src/lib/outfits/hairMotion';

const pose = [0, 0, 0, 0, 0, 0, 1];
const turned = [2, 4, 6, 0, 0, Math.SQRT1_2, Math.SQRT1_2];
const fixture = () => ({
  version: 1,
  itemId: 10200010,
  bodyVariant: 'female',
  clip: 'fitting_idle_a',
  placements: [0, 0],
  scale: 1,
  dt: 0.1,
  duration: 0.1,
  clientCoreVerified: true,
  clientSceneParity: false,
  sourceSha256: '2f10b2d4a9d8a0c43f0d30cbabd363c49089dbeccddf2e95b3f2273db807acdd',
  limitations: ['Experimental scene'],
  frames: [
    [
      [pose, pose, pose],
      [pose, pose, pose]
    ],
    [
      [turned, turned, turned],
      [turned, turned, turned]
    ]
  ]
});

describe('native hair motion playback', () => {
  it('interpolates translation and rotation without extrapolating past the sample', () => {
    const sample = hairMotionSchema.parse(fixture());
    const middle = sampleHairMotion(sample, 0.05)[0][1];
    expect(middle.position.toArray()).toEqual([1, 2, 3]);
    expect(middle.rotation.z).toBeCloseTo(Math.sin(Math.PI / 8));
    expect(middle.rotation.w).toBeCloseTo(Math.cos(Math.PI / 8));
    expect(sampleHairMotion(sample, -1)[1][2].position.toArray()).toEqual([0, 0, 0]);
    expect(sampleHairMotion(sample, 10)[1][2].position.toArray()).toEqual([2, 4, 6]);
    expect(() => sampleHairMotion(sample, NaN)).toThrow('Invalid motion time');
  });
  it('rejects wrong source identity, inconsistent duration and nonunit rotations', () => {
    expect(hairMotionSchema.safeParse({ ...fixture(), sourceSha256: 'wrong' }).success).toBe(false);
    expect(hairMotionSchema.safeParse({ ...fixture(), duration: 0.2 }).success).toBe(false);
    const bad = structuredClone(fixture());
    bad.frames[0][0][1] = [0, 0, 0, 0, 0, 0, 2];
    expect(hairMotionSchema.safeParse(bad).success).toBe(false);
  });
  const path = 'static/gltf/sassy-pigtails-preview-01/motion-fitting-idle.json';
  it.skipIf(!existsSync(path))(
    'loads actual client-solver output with moving destination bones',
    () => {
      const sample = hairMotionSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
      expect(sample.frames).toHaveLength(481);
      expect(sample.duration).toBeCloseTo(8);
      for (let tail = 0; tail < 2; tail++) {
        const initial = sampleHairMotion(sample, 0)[tail];
        const relative = initial[0].rotation.clone().invert().multiply(initial[2].rotation);
        expect(
          sample.frames.some((_, frame) => {
            const current = sampleHairMotion(sample, frame * sample.dt)[tail];
            const changed = current[0].rotation.clone().invert().multiply(current[2].rotation);
            return changed.normalize().angleTo(relative.clone().normalize()) > 0.02;
          })
        ).toBe(true);
      }
    }
  );
});
