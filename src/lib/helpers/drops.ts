export const DROP_TYPES = [
  { value: 0, label: 'On Death' },
  { value: 1, label: 'On Hit' }
] as const;

const dropTypeLabels = new Map<number, string>(
  DROP_TYPES.map((entry) => [entry.value, entry.label])
);

export function getDropTypeLabel(dropType: number): string {
  return dropTypeLabels.get(dropType) ?? `Type ${dropType}`;
}

export function formatDropCount(min: number, max: number): string {
  if (max <= min) {
    return `${min}`;
  }
  return `${min} ~ ${max}`;
}
