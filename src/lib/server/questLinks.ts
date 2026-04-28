import { Prisma } from '$lib/generated/prisma/client';
import type { PrismaClient } from '$lib/generated/prisma/client';
import { ITEM_OBJECTIVE_TYPES, NPC_OBJECTIVE_TYPES } from '$lib/helpers/quests';
import type {
  QuestLink,
  QuestObjective,
  QuestObjectiveItem,
  QuestObjectiveNpc,
  QuestRewardLink
} from '$lib/types/Quest';

type RawQuestObjective = Omit<QuestObjective, 'codes' | 'targets' | 'items' | 'npcs'> & {
  codes: unknown;
  targets: unknown;
};

function isMissingQuestIndexTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('quest_objectives') || message.includes('quest_rewards');
}

function normalizeJsonArray(value: unknown): Array<string | number> {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string | number => {
      return typeof entry === 'string' || typeof entry === 'number';
    });
  }

  if (typeof value === 'string') {
    try {
      return normalizeJsonArray(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

export async function getRequiredByQuests(
  prisma: PrismaClient,
  itemId: number
): Promise<QuestLink[]> {
  try {
    return await prisma.$queryRaw<QuestLink[]>`
      SELECT DISTINCT q.id, q.name, q.questType, q.requiredLevel
      FROM quest_objectives o
      JOIN quests q ON q.id = o.quest_id
      WHERE o.condition_type IN (${Prisma.join(ITEM_OBJECTIVE_TYPES)})
        AND (
          o.first_code = ${itemId}
          OR JSON_CONTAINS(o.codes, JSON_QUOTE(CAST(${itemId} AS CHAR)))
        )
      ORDER BY q.requiredLevel ASC, q.name ASC
      LIMIT 200
    `;
  } catch (error) {
    if (isMissingQuestIndexTableError(error)) return [];
    throw error;
  }
}

export async function getRewardedByQuests(
  prisma: PrismaClient,
  itemId: number
): Promise<QuestRewardLink[]> {
  try {
    return await prisma.$queryRaw<QuestRewardLink[]>`
      SELECT DISTINCT q.id, q.name, q.questType, q.requiredLevel, qr.reward_kind, qr.count
      FROM quest_rewards qr
      JOIN quests q ON q.id = qr.quest_id
      WHERE qr.item_id = ${itemId}
      ORDER BY q.requiredLevel ASC, q.name ASC
      LIMIT 200
    `;
  } catch (error) {
    if (isMissingQuestIndexTableError(error)) return [];
    throw error;
  }
}

export async function getRequiredForQuests(
  prisma: PrismaClient,
  npcId: number
): Promise<QuestLink[]> {
  try {
    return await prisma.$queryRaw<QuestLink[]>`
      SELECT DISTINCT q.id, q.name, q.questType, q.requiredLevel
      FROM quest_objectives o
      JOIN quests q ON q.id = o.quest_id
      WHERE o.condition_type IN (${Prisma.join(NPC_OBJECTIVE_TYPES)})
        AND (
          o.first_code = ${npcId}
          OR JSON_CONTAINS(o.codes, JSON_QUOTE(CAST(${npcId} AS CHAR)))
        )
      ORDER BY q.requiredLevel ASC, q.name ASC
      LIMIT 200
    `;
  } catch (error) {
    if (isMissingQuestIndexTableError(error)) return [];
    throw error;
  }
}

export async function getQuestObjectives(
  prisma: PrismaClient,
  questId: number
): Promise<QuestObjective[]> {
  let objectives: RawQuestObjective[];
  try {
    objectives = await prisma.$queryRaw<RawQuestObjective[]>`
      SELECT id, quest_id, sequence, condition_type, required_value, codes, targets, party_count, guild_party_count
      FROM quest_objectives
      WHERE quest_id = ${questId}
      ORDER BY sequence ASC
      LIMIT 500
    `;
  } catch (error) {
    if (isMissingQuestIndexTableError(error)) return [];
    throw error;
  }

  const normalized = objectives.map((objective) => ({
    ...objective,
    required_value: Number(objective.required_value),
    codes: normalizeJsonArray(objective.codes),
    targets: normalizeJsonArray(objective.targets),
    items: [],
    npcs: []
  }));

  const codes = Array.from(
    new Set(normalized.flatMap((objective) => objective.codes.map((code) => Number(code))))
  ).filter((code) => Number.isFinite(code) && code > 0);

  if (codes.length === 0) {
    return normalized;
  }

  const [items, npcs] = await Promise.all([
    prisma.$queryRaw<QuestObjectiveItem[]>`
      SELECT id, name, icon_path, rarity, is_outfit
      FROM items
      WHERE id IN (${Prisma.join(codes)})
    `,
    prisma.$queryRaw<QuestObjectiveNpc[]>`
      SELECT id, name, portrait
      FROM npcs
      WHERE id IN (${Prisma.join(codes)})
    `
  ]);

  const itemById = new Map(items.map((item) => [item.id, item]));
  const npcById = new Map(npcs.map((npc) => [npc.id, npc]));

  return normalized.map((objective) => ({
    ...objective,
    items: objective.codes.map((code) => itemById.get(Number(code))).filter((item) => item !== undefined),
    npcs: objective.codes.map((code) => npcById.get(Number(code))).filter((npc) => npc !== undefined)
  }));
}
