import { expect, it } from 'vitest';
import { defaultEquipmentClip } from '../src/lib/outfits/equipmentPlayback';
it('uses the source idle sequence and rejects an ambiguous multi-clip default', () => {
  expect(defaultEquipmentClip(['Attack_Idle_A', 'Idle_A'])).toBe('Idle_A');
  expect(defaultEquipmentClip(['13400001_attack_idle_a', '13400001_idle_a'])).toBe(
    '13400001_idle_a'
  );
  expect(defaultEquipmentClip(['Embedded_Idle'])).toBe('Embedded_Idle');
  expect(defaultEquipmentClip([])).toBeUndefined();
  expect(() => defaultEquipmentClip(['Run_A', 'Attack_Idle_A'])).toThrow('unambiguous');
});

it('uses an explicit exported default while keeping ambiguous names strict', () => {
  const names = ['Idle_A [sequence 28]', 'Idle_A [sequence 0]'];
  expect(defaultEquipmentClip(names, names[1])).toBe(names[1]);
  expect(() => defaultEquipmentClip(names)).toThrow('unambiguous');
  expect(() => defaultEquipmentClip(names, 'missing')).toThrow('missing or duplicated');
  expect(() => defaultEquipmentClip([names[0], names[0]], names[0])).toThrow('duplicated');
});
