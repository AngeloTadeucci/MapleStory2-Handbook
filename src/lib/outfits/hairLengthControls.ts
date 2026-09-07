import type { Mesh } from 'three';
import scaleSource from './hair-scale-source.json';

export type HairScaleRange = { min: number; max: number; reverse?: boolean };
const scaleItems: Record<
  string,
  { enabled: boolean; scales: (HairScaleRange & { reverse: boolean; values: number[] })[] }
> = scaleSource.items;

export function hairScaleRange(presetId: number, index: number, values: number[]) {
  const item = scaleItems[String(presetId)];
  const scale = item?.scales[index];
  // Match the packaged values before applying local XML metadata.
  if (
    !item?.enabled ||
    !scale ||
    scale.min >= scale.max ||
    scale.values.length !== values.length ||
    scale.values.some((v, i) => v !== values[i])
  )
    return;
  return { min: scale.min, max: scale.max, ...(scale.reverse ? { reverse: true } : {}) };
}

// KMS2 beauty-shop handlers 0x140f32a70 and 0x1418c78d0 apply this
// involution only at the UI boundary. Saved appearance is never reversed.
export function hairScaleUiValue(value: number, range?: HairScaleRange) {
  return range?.reverse ? range.max - value + range.min : value;
}

export function validHairScale(value: number, values: number[], range?: HairScaleRange) {
  return (
    Number.isFinite(value) &&
    (range ? value >= range.min && value <= range.max : values.includes(value))
  );
}

// CKfmModel::vfunction11 uses these exact names, independent of mesh order.
export function hairLengthIndex(name: string) {
  if (name === 'HR:0' || name === 'HR0:0') return 0;
  if (name === 'HR1:1') return 1;
}

export function applySavedHairLength(mesh: Mesh, value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid saved hair length');
  if (mesh.morphTargetInfluences?.length !== 1) return false;
  captureHairDefault(mesh);
  // The client forwards CHairExtraData's float to the morph controller.
  // Customization UI bounds do not restrict imported saved appearance.
  mesh.morphTargetInfluences[0] = value;
  return true;
}

const defaults = new WeakMap<Mesh, number>();
export function captureHairDefault(mesh: Mesh) {
  if (mesh.morphTargetInfluences?.length === 1 && !defaults.has(mesh))
    defaults.set(mesh, mesh.morphTargetInfluences[0]);
}

export function hairLengthControl(
  mesh: Mesh,
  label: string,
  values: number[],
  remember: (value: number) => void,
  range?: HairScaleRange
) {
  // Preset count does not determine the client's independent min/max range.
  if ((!range && new Set(values).size < 2) || mesh.morphTargetInfluences?.length !== 1) return;
  captureHairDefault(mesh);
  return {
    label,
    values,
    range,
    value: hairScaleUiValue(mesh.morphTargetInfluences[0], range),
    reset() {
      const value = defaults.get(mesh)!;
      mesh.morphTargetInfluences![0] = value;
      remember(value);
    },
    set(value: number) {
      if (!validHairScale(value, values, range)) throw new Error('Unsupported hair length');
      const stored = hairScaleUiValue(value, range);
      const clamped = range ? Math.min(range.max, Math.max(range.min, stored)) : stored;
      mesh.morphTargetInfluences![0] = clamped;
      remember(clamped);
    }
  };
}
