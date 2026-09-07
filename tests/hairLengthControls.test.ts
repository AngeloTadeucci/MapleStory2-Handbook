import { expect, it, vi } from 'vitest';
import { Mesh } from 'three';
import {
  captureHairDefault,
  hairLengthControl,
  applySavedHairLength,
  hairLengthIndex,
  hairScaleRange,
  hairScaleUiValue
} from '../src/lib/outfits/hairLengthControls';

it('applies continuous saved values independently of picker presets and preserves reset', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [0.5];
  expect(applySavedHairLength(mesh, 1)).toBe(true);
  const control = hairLengthControl(mesh, 'Hair', [0.3, 0.5, 0.9], () => {})!;
  expect(control.value).toBe(1);
  control.reset();
  expect(mesh.morphTargetInfluences).toEqual([0.5]);
  for (const value of [NaN, Infinity, -1])
    expect(() => applySavedHairLength(mesh, value)).toThrow();
  expect(mesh.morphTargetInfluences).toEqual([0.5]);
});

it('maps client back/front targets by name and excludes unrelated mesh morphs', () => {
  expect(['HR1:1', 'HR0:0', 'HR:0', 'HR_Pony', 'Face'].map(hairLengthIndex)).toEqual([
    1,
    0,
    0,
    undefined,
    undefined
  ]);
});

it('leaves a single preset unchanged when no verified UI range is supplied', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [0];
  const remember = vi.fn();
  expect(hairLengthControl(mesh, 'Shiny Long Velvet Hair length 1', [1], remember)).toBeUndefined();
  expect(mesh.morphTargetInfluences).toEqual([0]);
  expect(remember).not.toHaveBeenCalled();
});

it('allows a single-preset channel to use its independent client range without changing its initial morph', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [1];
  const range = hairScaleRange(10200213, 1, [1]);
  expect(range).toEqual({ min: 0, max: 1 });
  const remember = vi.fn();
  const control = hairLengthControl(mesh, 'Front', [1], remember, range)!;
  expect(mesh.morphTargetInfluences).toEqual([1]);
  control.set(0.37);
  expect(mesh.morphTargetInfluences).toEqual([0.37]);
  expect(remember).toHaveBeenLastCalledWith(0.37);
  for (const value of [-0.1, 1.01, NaN, Infinity])
    expect(() => control.set(value)).toThrow('Unsupported hair length');
  control.reset();
  expect(mesh.morphTargetInfluences).toEqual([1]);
});

it('uses source bounds above one and leaves mismatched records on presets', () => {
  expect(hairScaleRange(10200008, 0, [0.8, 1, 1.2])).toEqual({ min: 0.8, max: 1.2 });
  expect(hairScaleRange(10200008, 0, [0.8, 1])).toBeUndefined();
  expect(hairScaleRange(10200002, 0, [0.2, 0.4, 0.6, 0.8, 1])).toEqual({
    min: 0,
    max: 1,
    reverse: true
  });
  expect(hairScaleRange(10200156, 0, [1])).toBeUndefined();
  expect(hairScaleRange(99999999, 0, [1])).toBeUndefined();
});

it('reverses only the slider boundary using both bounds, preserving raw saved values and reset', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [0.5];
  captureHairDefault(mesh);
  applySavedHairLength(mesh, 0.8);
  const range = hairScaleRange(10200067, 0, [1])!;
  expect(range).toEqual({ min: 0.4, max: 1.5, reverse: true });
  const remember = vi.fn();
  const make = () => hairLengthControl(mesh, 'Hair', [1], remember, range)!;
  expect(make().value).toBeCloseTo(1.1);
  make().set(1.2);
  expect(mesh.morphTargetInfluences![0]).toBeCloseTo(0.7);
  expect(remember.mock.lastCall![0]).toBeCloseTo(0.7);
  for (const display of [range.min, range.max]) {
    make().set(display);
    expect(make().value).toBeCloseTo(display);
    expect(hairScaleUiValue(hairScaleUiValue(display, range), range)).toBeCloseTo(display);
  }
  expect(() => make().set(1.6)).toThrow('Unsupported hair length');
  make().reset();
  expect(mesh.morphTargetInfluences![0]).toBe(0.5);
  expect(make().value).toBeCloseTo(1.4);
  applySavedHairLength(mesh, 1.6);
  expect(mesh.morphTargetInfluences![0]).toBe(1.6);
});

it('applies and remembers every declared adjustable length, including values above one', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [1];
  const remember = vi.fn();
  const control = hairLengthControl(mesh, 'Hair', [0.8, 1, 1.2], remember)!;
  for (const value of control.values) {
    control.set(value);
    expect(mesh.morphTargetInfluences).toEqual([value]);
    expect(remember).toHaveBeenLastCalledWith(value);
  }
  expect(() => control.set(1.3)).toThrow('Unsupported hair length');
  expect(mesh.morphTargetInfluences).toEqual([1.2]);
});

it('resets a native zero morph even when only nonzero lengths are selectable', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [0];
  captureHairDefault(mesh);
  mesh.morphTargetInfluences[0] = 0.7;
  const remember = vi.fn();
  const control = hairLengthControl(mesh, 'Shiny Smart Cut length 1', [0.3, 0.5, 0.7], remember)!;
  control.set(0.5);
  control.reset();
  expect(mesh.morphTargetInfluences).toEqual([0]);
  expect(remember).toHaveBeenLastCalledWith(0);
  expect(hairLengthControl(mesh, 'Hair', [0.3, 0.5, 0.7], remember)!.value).toBe(0);
});
