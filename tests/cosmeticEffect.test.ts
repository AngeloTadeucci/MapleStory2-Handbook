import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import {
  cosmeticEffectSchema,
  evaluateCurve,
  effectUvMatrix,
  particleScale,
  ParticleSimulation,
  randomSequence,
  sampleSurface,
  type CosmeticEffectData
} from '../src/lib/outfits/cosmeticEffect';
import { readFileSync } from 'node:fs';

const sourcePath = process.env.SIMULATOR_EFFECT_FILE;
const quad = {
  positions: [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0]
  ],
  normals: [
    [0, 0, 1],
    [0, 0, 1],
    [0, 0, 1],
    [0, 0, 1]
  ],
  indices: [0, 1, 2, 1, 3, 2],
  uv: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]
};
const mat = { diffuse: [1, 1, 1], emissive: [0, 0, 0], alpha: 1 };
const system = {
  name: 'fixture',
  surface: quad,
  material: mat,
  texture: 'hitlight_8-2.png',
  capacity: 5,
  rate: 5,
  worldSpace: true,
  speed: 60,
  speedVariation: 12,
  size: 13,
  sizeVariation: 3.9,
  lifespan: 0.6,
  lifespanVariation: 1 / 3,
  growTime: 7 / 30,
  shrinkTime: 1 / 3,
  drag: 0.1
};
const fixture = {
  version: 1,
  kind: 'hair-twinkle-a',
  attachNode: 'Bip01 Head',
  itemIds: [10200121, 10200122, 10200123, 10200124],
  notes: [],
  systems: [
    system,
    {
      ...system,
      capacity: 3,
      rate: 3,
      worldSpace: false,
      speed: 0,
      speedVariation: 0,
      size: 10,
      sizeVariation: 3,
      drag: 0
    }
  ],
  glow: {
    surface: quad,
    material: mat,
    transforms: Array.from({ length: 3 }, () => [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1]),
    textures: ['gradient_light_02.png', 'one_002.png', 'alpha_0352.png'].map((texture, slot) => ({
      texture,
      slot,
      flags: 0,
      transform: null
    })),
    alphaKeys: [
      [0, 0.17, 0, 0],
      [0.26666668, 0.4, 0, 0],
      [0.5, 0.17, 0, 0]
    ],
    scaleUKeys: [
      [0, 0.65, 0, 0],
      [1, 0.3, 0, 0]
    ],
    scaleVKeys: [
      [0, 0.65, 0, 0],
      [1, 0.3, 0, 0]
    ]
  }
};
const data = cosmeticEffectSchema.parse(
  sourcePath ? JSON.parse(readFileSync(sourcePath, 'utf8')) : fixture
);
const run = (s: ParticleSimulation, seconds: number, head = new Matrix4()) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) s.step(1 / 120, head);
};
describe('source hair cosmetic effect', () => {
  it('applies source MAX UV transforms around the authored center', () => {
    const uv = new Vector3(0, 0, 1).applyMatrix3(
      effectUvMatrix({
        translation: [0, 0],
        scale: [0.65, 0.65],
        rotation: Math.PI,
        method: 1,
        center: [0.5, 0.5]
      })
    );
    expect(uv.x).toBeCloseTo(0.825);
    expect(uv.y).toBeCloseTo(0.825);
    const dark = new Vector3(0, 0, 1).applyMatrix3(
      effectUvMatrix({
        translation: [0, -0.5],
        scale: [1, 1],
        rotation: -Math.PI / 2,
        method: 1,
        center: [0.5, 0.5]
      })
    );
    expect(dark.x).toBeCloseTo(-0.5);
    expect(dark.y).toBeCloseTo(1);
  });
  it('maps only the four source hairs and preserves the two distinct emitters', () => {
    expect(data.itemIds).toEqual([10200121, 10200122, 10200123, 10200124]);
    expect(data.systems.map((s) => [s.rate, s.capacity, s.worldSpace, s.speed])).toEqual([
      [5, 5, true, 60],
      [3, 3, false, 0]
    ]);
    expect(data.systems[0].surface.positions.length).toBeGreaterThan(3);
  });
  it('samples inside a triangle and interpolates its normals', () => {
    const random = randomSequence(27);
    const surface = {
      positions: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0]
      ],
      normals: [
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1]
      ],
      indices: [0, 1, 2],
      uv: []
    } as CosmeticEffectData['systems'][number]['surface'];
    for (let i = 0; i < 100; i++) {
      const { position, normal } = sampleSurface(surface, random);
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.x + position.y).toBeLessThanOrEqual(1.00000001);
      expect(normal.z).toBe(1);
    }
  });
  it('world-space particles retain their birthplace when the head moves', () => {
    const world = new ParticleSimulation({
      ...data.systems[0],
      speed: 0,
      speedVariation: 0,
      lifespan: 2,
      lifespanVariation: 0
    });
    run(world, 0.2, new Matrix4().makeTranslation(100, 0, 0));
    const birthplace = world.particles[0].position.clone();
    run(world, 0.1, new Matrix4().makeTranslation(500, 0, 0));
    expect(world.particles[0].position.equals(birthplace)).toBe(true);
    const local = new ParticleSimulation(data.systems[1]);
    run(local, 0.4, new Matrix4().makeTranslation(500, 0, 0));
    expect(local.particles[0].position.x).toBeLessThan(100);
  });
  it('caps long playback, expires particles and reproduces reset state', () => {
    const sim = new ParticleSimulation(data.systems[0]);
    run(sim, 60);
    expect(sim.particles.length).toBeLessThanOrEqual(5);
    expect(sim.particles.every((p) => p.age < p.life)).toBe(true);
    sim.reset();
    run(sim, 2);
    const a = JSON.stringify(sim.particles);
    sim.reset();
    run(sim, 2);
    expect(JSON.stringify(sim.particles)).toBe(a);
  });
  it('applies the skeleton unit scale to world particle velocity and size', () => {
    const source = { ...data.systems[0], speedVariation: 0, sizeVariation: 0 };
    const sim = new ParticleSimulation(source);
    run(sim, 0.2, new Matrix4().makeScale(0.01, 0.01, 0.01));
    expect(sim.particles[0].velocity.length()).toBeCloseTo(0.6);
    expect(sim.particles[0].size).toBeCloseTo(0.13);
  });
  it('grows from zero and shrinks to zero using source age times', () => {
    const s = data.systems[0];
    expect(particleScale({ age: 0, life: 1, size: 13 }, s)).toBe(0);
    expect(particleScale({ age: 0.4, life: 1, size: 13 }, s)).toBe(13);
    expect(particleScale({ age: 1, life: 1, size: 13 }, s)).toBe(0);
  });
  it('evaluates authored glow alpha keys and loop endpoints', () => {
    expect(evaluateCurve(data.glow.alphaKeys, 0)).toBeCloseTo(0.17);
    expect(evaluateCurve(data.glow.alphaKeys, 0.26666668)).toBeCloseTo(0.4);
    expect(evaluateCurve(data.glow.alphaKeys, 0.5)).toBeCloseTo(0.17);
  });
  it('rejects malformed surfaces and unrelated effect kinds', () => {
    expect(() => cosmeticEffectSchema.parse({ ...data, kind: 'badge' })).toThrow();
    const bad = structuredClone(data);
    bad.systems[0].surface.indices[0] = 999999;
    expect(() => cosmeticEffectSchema.parse(bad)).toThrow();
  });
});
