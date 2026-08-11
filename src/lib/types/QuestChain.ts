/**
 * Types for the quest chain browser (/quests/chains).
 *
 * Chapter membership is the one piece of data the handbook database does not
 * have: there is no chapter column on the quests table. It is supplied by the
 * generated asset in src/lib/data/questChapters.json. See
 * src/lib/server/questChapters.ts for the join and for the note on removing
 * that asset once the backend GameParser stores a chapter id.
 */

export interface ChapterSummary {
  id: number;
  name: string;
  category: string;
  categoryLabel: string;
  questCount: number;
  minLevel: number | null;
  maxLevel: number | null;
  questTypes: number[];
}

/** A quest as the chain views need it: identity, level, and its edges. */
export interface ChainQuest {
  id: number;
  name: string;
  questType: number;
  questLevel: number;
  requiredLevel: number;
  chapterId: number | null;
  chapterName: string | null;
  /** Prerequisites that must all be completed. */
  requires: number[];
  /** Prerequisites where completing any one of them is enough. */
  selectable: number[];
  /** Quests that list this one as a prerequisite. */
  unlocks: number[];
}

/**
 * A quest's place in the scope being drawn.
 * `in`   the quest belongs to the scope itself
 * `up`   a prerequisite pulled in from outside the scope
 * `down` a quest outside the scope that this scope unlocks
 */
export type ChainNodeRole = 'in' | 'up' | 'down';

export interface ChainNode extends ChainQuest {
  role: ChainNodeRole;
}

export type ChainEdgeKind = 'required' | 'selectable';

export interface ChainEdge {
  from: number;
  to: number;
  kind: ChainEdgeKind;
}

export interface ChainScope {
  nodes: ChainNode[];
  edges: ChainEdge[];
  /** Quests inside the scope proper, excluding the `up` and `down` context. */
  coreCount: number;
}

export interface ChainQuestDetail extends ChainQuest {
  startNpcId: number;
  startNpcName: string | null;
  completeNpcId: number;
  completeNpcName: string | null;
  requiredQuests: Array<{ id: number; name: string }>;
  selectableQuests: Array<{ id: number; name: string }>;
  unlockedQuests: Array<{ id: number; name: string }>;
}

/**
 * Chapter categories as they are spelled in the game's
 * chapterdescription_*.xml files, mapped to labels for the UI.
 */
export const CHAPTER_CATEGORIES: Record<string, string> = {
  epic: 'Epic Story',
  world: 'World',
  guide: 'Guide',
  tutorial: 'Tutorial',
  eventkr: 'Event (KR)',
  eventna: 'Event (NA)',
  eventcn: 'Event (CN)',
  eventcommon: 'Event',
  famecontents: 'Fame',
  guild: 'Guild',
  item: 'Item',
  unlisted: 'Unlisted'
};

export function getChapterCategoryName(category: string): string {
  return CHAPTER_CATEGORIES[category] ?? category;
}

export function chapterCategoryToWhitelist(): string[] {
  return Object.values(CHAPTER_CATEGORIES);
}

export function getChapterCategoryByDisplayName(displayName: string): string | undefined {
  return Object.keys(CHAPTER_CATEGORIES).find((key) => CHAPTER_CATEGORIES[key] === displayName);
}
