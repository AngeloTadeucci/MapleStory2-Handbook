export const ITEM_OBJECTIVE_TYPES = [
  'item_pickup',
  'item_collect',
  'item_collect_revise',
  'item_exist',
  'item_inven',
  'item_add'
] as const;

export const NPC_OBJECTIVE_TYPES = [
  'npc',
  'npc_lasthit',
  'npc_lasthit_buff',
  'npc_lasthit_time',
  'npc_field_boss',
  'npc_field_elite',
  'npc_dungeon_boss',
  'killcount',
  'spawner'
] as const;

export type ItemObjectiveType = (typeof ITEM_OBJECTIVE_TYPES)[number];
export type NpcObjectiveType = (typeof NPC_OBJECTIVE_TYPES)[number];

export function getObjectiveLabel(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function matchesObjectiveCode(codes: Array<string | number>, id: number): boolean {
  return codes.some((code) => Number(code) === id);
}
