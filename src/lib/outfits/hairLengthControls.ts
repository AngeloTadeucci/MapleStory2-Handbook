import type { Mesh } from 'three';

const defaults = new WeakMap<Mesh, number>();
export function captureHairDefault(mesh: Mesh) {
  if (mesh.morphTargetInfluences?.length === 1 && !defaults.has(mesh))
    defaults.set(mesh, mesh.morphTargetInfluences[0]);
}

export function hairLengthControl(
  mesh: Mesh,
  label: string,
  values: number[],
  remember: (value: number) => void
) {
  // A single scale is a fixed source setting, not an adjustable morph range.
  if (new Set(values).size < 2 || mesh.morphTargetInfluences?.length !== 1) return;
  captureHairDefault(mesh);
  return {
    label,
    values,
    value: mesh.morphTargetInfluences[0],
    reset() {
      const value = defaults.get(mesh)!;
      mesh.morphTargetInfluences![0] = value;
      remember(value);
    },
    set(value: number) {
      if (!values.includes(value)) throw new Error('Unsupported hair length');
      mesh.morphTargetInfluences![0] = value;
      remember(value);
    }
  };
}
