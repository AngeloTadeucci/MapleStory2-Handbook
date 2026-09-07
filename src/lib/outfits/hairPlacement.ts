import { Euler, Object3D, Quaternion, SkinnedMesh } from 'three';
import type { NativeAsset } from '$lib/nativeAssets';
import { sourceName } from './sharedSkeleton';
import source from './hair-placement-source.json';

type PlacementPart = {
  source: string;
  selfNode: string;
  targetNode: string;
  presets: { position: number[]; rotation: number[] }[];
  jointAngles: { name: string; soft?: string; posz?: string; zero?: string; negz?: string }[];
};
const items: Record<string, PlacementPart[]> = source.items;

export function clientHairRotation(angles: number[]) {
  // KMS2 0x142083d40 constructs row-major Rx(-x) * Ry(-y) * Rz(-z).
  // Its matrix multiply is 0x140a33480; the named Lua wrapper confirms XYZ.
  return new Quaternion().setFromEuler(
    new Euler(
      ...(angles.map((angle) => (-angle * Math.PI) / 180) as [number, number, number]),
      'XYZ'
    )
  );
}

export function hairPlacementSource(presetId: number, asset: NativeAsset) {
  const name = asset.input
    .split('/')
    .at(-1)!
    .replace(/\.nif$/i, '')
    .toLowerCase();
  return items[String(presetId)]?.find((part) => part.source === name);
}

export function createHairPlacement(
  group: Object3D,
  part: PlacementPart,
  label: string,
  initial: number,
  remember: (value: number) => void
) {
  const roots = new Set<Object3D>();
  group.traverse((node) => {
    if (!(node instanceof SkinnedMesh)) return;
    for (const bone of node.skeleton.bones) {
      for (
        let parent: Object3D | null = bone;
        parent?.userData.equipmentBone;
        parent = parent.parent
      ) {
        if (sourceName(parent) === part.selfNode && sourceName(parent.parent!) === part.targetNode)
          roots.add(parent);
      }
    }
  });
  if (roots.size !== 1) throw new Error(`Hair placement needs one ${part.selfNode} attachment`);
  const root = [...roots][0];
  let value = initial;
  const rotations = part.presets.map((preset) => clientHairRotation(preset.rotation));
  const apply = () => {
    const preset = part.presets[value];
    // The exported head skeleton remains in source coordinates beneath the
    // single glTF conversion root. Do not convert these coordinates again.
    root.position.fromArray(preset.position);
    root.quaternion.copy(rotations[value]);
    root.updateWorldMatrix(true, true);
  };
  const set = (next: number) => {
    if (!Number.isInteger(next) || !part.presets[next]) throw new Error('Unknown hair placement');
    value = next;
    remember(value);
    apply();
  };
  if (!part.presets[value]) value = 0;
  apply();
  return {
    label,
    values: part.presets.map((_, index) => index),
    get value() {
      return value;
    },
    set,
    reset: () => set(0),
    apply
  };
}

export type HairPlacementControl = ReturnType<typeof createHairPlacement>;
