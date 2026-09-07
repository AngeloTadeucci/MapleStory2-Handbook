import { expect, it, vi } from 'vitest';
import { Mesh } from 'three';
import { captureHairDefault, hairLengthControl } from '../src/lib/outfits/hairLengthControls';

it('leaves the fixed Shiny Long Velvet Hair source morph at its authored default', () => {
  const mesh = new Mesh();
  mesh.morphTargetInfluences = [0];
  const remember = vi.fn();
  expect(hairLengthControl(mesh, 'Shiny Long Velvet Hair length 1', [1], remember)).toBeUndefined();
  expect(mesh.morphTargetInfluences).toEqual([0]);
  expect(remember).not.toHaveBeenCalled();
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
