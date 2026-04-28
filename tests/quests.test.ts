import { describe, expect, test } from 'vitest';
import {
  getObjectiveLabel,
  ITEM_OBJECTIVE_TYPES,
  matchesObjectiveCode,
  NPC_OBJECTIVE_TYPES
} from '$lib/helpers/quests';

describe('quest helpers', () => {
  test('contains item objective condition types used for reverse item links', () => {
    expect(ITEM_OBJECTIVE_TYPES).toContain('item_collect');
    expect(ITEM_OBJECTIVE_TYPES).toContain('item_inven');
    expect(ITEM_OBJECTIVE_TYPES).not.toContain('npc');
  });

  test('contains npc objective condition types used for reverse npc links', () => {
    expect(NPC_OBJECTIVE_TYPES).toContain('npc');
    expect(NPC_OBJECTIVE_TYPES).toContain('npc_lasthit');
    expect(NPC_OBJECTIVE_TYPES).not.toContain('item_collect');
  });

  test('turns unknown objective types into readable labels', () => {
    expect(getObjectiveLabel('stay_map')).toBe('Stay Map');
    expect(getObjectiveLabel('npc_field_boss')).toBe('Npc Field Boss');
  });

  test('matches objective ids stored as strings or numbers', () => {
    expect(matchesObjectiveCode(['30000368'], 30000368)).toBe(true);
    expect(matchesObjectiveCode([30000368], 30000368)).toBe(true);
    expect(matchesObjectiveCode(['21000174'], 30000368)).toBe(false);
  });
});
