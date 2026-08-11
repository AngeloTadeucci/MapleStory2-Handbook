/**
 * Chapter membership for quests, joined to the handbook database.
 *
 * The quests table has no chapter column, so chapter membership arrives as a
 * generated asset (src/lib/data/questChapters.json) built by
 * MapleStory2-XML/Tools/questgraph/build_quest_graph.py --mode index. The
 * asset is 168 KB raw, 30 KB gzipped, versus 2.4 MB for the prototype's full
 * graph dump, because everything else it used to carry (quest names, levels,
 * types, prerequisites) already lives in the database.
 *
 * The asset lives under src/lib and is imported as raw text by this server-only
 * module. That keeps it out of the client bundle, guarantees it is present in
 * the built server bundle, and avoids a runtime file read with a path that
 * differs between dev and the node adapter. Importing it as JSON instead would
 * make TypeScript infer a 7,000-property literal type for no benefit.
 *
 * DURABLE FIX: the backend GameParser should write a chapterId column on the
 * quests table. When it does, this asset and this whole module's chapter half
 * can be deleted and the loader can read chapters straight from Prisma. Per
 * agents.md that is a backend-team change and is out of scope for the frontend.
 */

import chapterAssetRaw from '$lib/data/questChapters.json?raw';
import DBClient from '$lib/prismaClient';
import type {
  ChainNode,
  ChainNodeRole,
  ChainQuest,
  ChainQuestDetail,
  ChainScope,
  ChapterSummary
} from '$lib/types/QuestChain';
import { getChapterCategoryName } from '$lib/types/QuestChain';

interface ChapterAsset {
  generated: { locale: string; chapterCount: number; questCount: number; source: string };
  chapters: Array<{ id: number; name: string; category: string }>;
  questChapters: Record<string, number>;
}

/** Largest scope handed to the browser. Larger chapters are reported as trimmed. */
export const MAX_SCOPE_QUESTS = 600;

/** Above this node count the graph stops being legible, so the table is used. */
export const MAX_GRAPH_NODES = 400;

/**
 * How far the chain view walks out from the quest it was opened on.
 *
 * Chapters are only a labelling layer: the prerequisite data runs straight
 * through the boundary, because each chapter's last quest is a prerequisite of
 * the next chapter's first. So the whole Epic Story is one connected graph and
 * an unbounded walk reaches nearly all of it. From "Farewell for Now" (50001566,
 * level 24) it is 76 hops back to the level 1 tutorial quest and 195 hops to the
 * far end, taking in 848 quests across 43 chapters.
 *
 * Twenty hops keeps the view to the quests either side of the one being read.
 * Measured from that same quest: 4 hops reaches 9 quests, 8 reaches 17, 16
 * reaches 33, and everything past 33 hops is the remaining 599.
 */
export const MAX_CHAIN_HOPS = 20;

/**
 * How many background tints the chapter areas in the graph are drawn from. The
 * palette itself lives in ChainGraph.svelte and this has to stay in step with it.
 */
export const CHAPTER_TONES = 4;

/** The bucket the graph puts the quests that belong to no chapter in. */
export const NO_CHAPTER_ID = -1;

const asset = JSON.parse(chapterAssetRaw) as ChapterAsset;

const CACHE_TTL_MS = 15 * 60 * 1000;

export interface ChainIndex {
  quests: Map<number, ChainQuest>;
  chapters: Map<number, ChapterSummary>;
  chapterQuests: Map<number, number[]>;
  /** Chapters that hold at least one quest present in the database. */
  orderedChapters: ChapterSummary[];
  /** Background tint per chapter, the same in every view. See buildChapterTones. */
  chapterTones: Map<number, number>;
  stats: {
    questCount: number;
    chapterCount: number;
    unmappedQuestCount: number;
    chainedQuestCount: number;
    assetLocale: string;
  };
}

let cached: { builtAt: number; index: ChainIndex } | null = null;
let inFlight: Promise<ChainIndex> | null = null;

export async function getChainIndex(): Promise<ChainIndex> {
  if (cached && Date.now() - cached.builtAt < CACHE_TTL_MS) {
    return cached.index;
  }
  if (!inFlight) {
    inFlight = buildChainIndex()
      .then((index) => {
        cached = { builtAt: Date.now(), index };
        return index;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

function toIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids: number[] = [];
  for (const entry of value) {
    const id = typeof entry === 'number' ? entry : Number(entry);
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return ids;
}

async function buildChainIndex(): Promise<ChainIndex> {
  const prisma = DBClient.getInstance().prisma;
  const rows = await prisma.quests.findMany({
    select: {
      id: true,
      name: true,
      questType: true,
      questLevel: true,
      requiredLevel: true,
      requiredQuest: true,
      selectableQuest: true
    },
    orderBy: { id: 'asc' }
  });

  const chapterMeta = new Map(asset.chapters.map((chapter) => [chapter.id, chapter]));
  const chapterOfQuest = new Map<number, number>();
  for (const [questId, chapterId] of Object.entries(asset.questChapters)) {
    chapterOfQuest.set(Number(questId), chapterId);
  }

  const quests = new Map<number, ChainQuest>();
  let unmappedQuestCount = 0;

  for (const row of rows) {
    const chapterId = chapterOfQuest.get(row.id) ?? null;
    if (chapterId === null) unmappedQuestCount++;
    const meta = chapterId === null ? undefined : chapterMeta.get(chapterId);
    quests.set(row.id, {
      id: row.id,
      name: row.name,
      questType: row.questType,
      questLevel: row.questLevel,
      requiredLevel: row.requiredLevel,
      chapterId,
      chapterName: meta?.name ?? null,
      requires: toIdList(row.requiredQuest),
      selectable: toIdList(row.selectableQuest),
      unlocks: []
    });
  }

  // Reverse index. Prerequisites that point at a quest the database does not
  // have are dropped: there is no page to link to and no node to draw.
  for (const quest of quests.values()) {
    quest.requires = quest.requires.filter((id) => quests.has(id));
    // A quest listed as both a hard and a selectable prerequisite is one edge.
    quest.selectable = quest.selectable.filter(
      (id) => quests.has(id) && !quest.requires.includes(id)
    );
    for (const prerequisite of [...quest.requires, ...quest.selectable]) {
      quests.get(prerequisite)?.unlocks.push(quest.id);
    }
  }

  const chapterQuests = new Map<number, number[]>();
  for (const quest of quests.values()) {
    if (quest.chapterId === null) continue;
    const bucket = chapterQuests.get(quest.chapterId);
    if (bucket) bucket.push(quest.id);
    else chapterQuests.set(quest.chapterId, [quest.id]);
  }

  const chapters = new Map<number, ChapterSummary>();
  for (const [chapterId, questIds] of chapterQuests) {
    const meta = chapterMeta.get(chapterId);
    const types = new Set<number>();
    let minLevel: number | null = null;
    let maxLevel: number | null = null;
    for (const questId of questIds) {
      const quest = quests.get(questId);
      if (!quest) continue;
      types.add(quest.questType);
      if (quest.questLevel > 0) {
        if (minLevel === null || quest.questLevel < minLevel) minLevel = quest.questLevel;
        if (maxLevel === null || quest.questLevel > maxLevel) maxLevel = quest.questLevel;
      }
    }
    const category = meta?.category ?? 'unlisted';
    chapters.set(chapterId, {
      id: chapterId,
      name: meta?.name ?? `Chapter ${chapterId}`,
      category,
      categoryLabel: getChapterCategoryName(category),
      questCount: questIds.length,
      minLevel,
      maxLevel,
      questTypes: [...types].sort((a, b) => a - b)
    });
  }

  let chainedQuestCount = 0;
  for (const quest of quests.values()) {
    if (quest.requires.length > 0 || quest.selectable.length > 0 || quest.unlocks.length > 0) {
      chainedQuestCount++;
    }
  }

  const orderedChapters = [...chapters.values()].sort(
    (a, b) => b.questCount - a.questCount || a.name.localeCompare(b.name)
  );

  return {
    quests,
    chapters,
    chapterQuests,
    orderedChapters,
    chapterTones: buildChapterTones(quests),
    stats: {
      questCount: quests.size,
      chapterCount: chapters.size,
      unmappedQuestCount,
      chainedQuestCount,
      assetLocale: asset.generated.locale
    }
  };
}

/**
 * A background tint for every chapter, worked out once over the whole quest
 * graph rather than per view.
 *
 * Colouring only the chapters on screen is what a graph drawing usually wants,
 * but it hands the same chapter a different colour in each view it turns up in,
 * so the background reshuffles every time another quest is opened. Doing it once
 * over everything costs a few more clashes and gives a chapter one colour it
 * keeps everywhere.
 *
 * Two chapters count as neighbours when a quest in one leads into the other,
 * which is where their areas end up drawn side by side. Chapters that merely get
 * packed near each other on a wide screen are not modelled: that depends on the
 * viewport, which is exactly the view-dependence this is here to avoid.
 */
function buildChapterTones(quests: Map<number, ChainQuest>): Map<number, number> {
  const neighbours = new Map<number, Set<number>>();
  function bucket(chapterId: number): Set<number> {
    const held = neighbours.get(chapterId);
    if (held) return held;
    const fresh = new Set<number>();
    neighbours.set(chapterId, fresh);
    return fresh;
  }
  for (const quest of quests.values()) {
    const chapterId = quest.chapterId ?? NO_CHAPTER_ID;
    bucket(chapterId);
    for (const id of [...quest.requires, ...quest.selectable]) {
      const other = quests.get(id);
      if (!other) continue;
      const otherChapterId = other.chapterId ?? NO_CHAPTER_ID;
      if (otherChapterId === chapterId) continue;
      bucket(chapterId).add(otherChapterId);
      bucket(otherChapterId).add(chapterId);
    }
  }

  // Busiest chapter first: the one hemmed in by the most others has the fewest
  // tints left if it is picked late. Ties break on id so the result is the same
  // on every rebuild of the index.
  const chapterIds = [...neighbours.keys()].sort(
    (a, b) => (neighbours.get(b)?.size ?? 0) - (neighbours.get(a)?.size ?? 0) || a - b
  );
  const tones = new Map<number, number>();
  /** How many already tinted neighbours of this chapter carry a given tint. */
  function clashes(chapterId: number, tone: number): number {
    let count = 0;
    for (const other of neighbours.get(chapterId) ?? []) {
      if (tones.get(other) === tone) count++;
    }
    return count;
  }
  function bestTone(chapterId: number): number {
    // A free tint if there is one, otherwise the one the fewest neighbours
    // already carry, so a crowded spot degrades instead of breaking.
    //
    // The scan starts at a per chapter offset instead of at tint 0, which only
    // matters when several tints are equally free. Most chapters lead nowhere
    // outside themselves, so with a fixed start they would all take tint 0 and
    // then read as one field wherever the layout happens to pack two of them
    // side by side. Fanning them out costs nothing and measures much better.
    const offset = ((chapterId % CHAPTER_TONES) + CHAPTER_TONES) % CHAPTER_TONES;
    let chosen = offset;
    let fewest = Number.POSITIVE_INFINITY;
    for (let step = 0; step < CHAPTER_TONES; step++) {
      const tone = (offset + step) % CHAPTER_TONES;
      const count = clashes(chapterId, tone);
      if (count < fewest) {
        chosen = tone;
        fewest = count;
      }
      if (fewest === 0) break;
    }
    return chosen;
  }
  for (const chapterId of chapterIds) tones.set(chapterId, bestTone(chapterId));
  // The first pass only sees the chapters tinted before it, so a late neighbour
  // can still land on the same tint. Sweeping again with every tint known lets
  // those settle, and a handful of passes is enough to go quiet.
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const chapterId of chapterIds) {
      const current = tones.get(chapterId) ?? 0;
      if (clashes(chapterId, current) === 0) continue;
      const next = bestTone(chapterId);
      if (next === current) continue;
      tones.set(chapterId, next);
      moved = true;
    }
    if (!moved) break;
  }
  return tones;
}

export interface ScopeResult extends ChainScope {
  /** Quests inside the scope that were left out to keep the payload sane. */
  omittedCount: number;
}

function toNode(quest: ChainQuest, role: ChainNodeRole): ChainNode {
  return { ...quest, role };
}

function edgesFor(quest: ChainQuest, visible: Set<number>) {
  const edges: ChainScope['edges'] = [];
  for (const id of quest.requires) {
    if (visible.has(id)) edges.push({ from: id, to: quest.id, kind: 'required' });
  }
  for (const id of quest.selectable) {
    if (visible.has(id)) edges.push({ from: id, to: quest.id, kind: 'selectable' });
  }
  return edges;
}

/**
 * Every quest in one chapter, plus the immediate prerequisites and unlocked
 * quests that sit outside it so the chain does not look severed at the border.
 */
export function buildChapterScope(index: ChainIndex, chapterId: number): ScopeResult {
  const all = index.chapterQuests.get(chapterId) ?? [];
  // When a chapter is too big to send whole, keep the quests that actually
  // take part in a chain: the unchained remainder is what the table is for.
  const ordered = [...all].sort((a, b) => {
    const questA = index.quests.get(a);
    const questB = index.quests.get(b);
    const chainedA =
      questA && (questA.requires.length || questA.selectable.length || questA.unlocks.length)
        ? 0
        : 1;
    const chainedB =
      questB && (questB.requires.length || questB.selectable.length || questB.unlocks.length)
        ? 0
        : 1;
    return chainedA - chainedB || a - b;
  });
  const core = ordered.slice(0, MAX_SCOPE_QUESTS);
  const coreSet = new Set(core);

  const nodes = new Map<number, ChainNode>();
  for (const id of core) {
    const quest = index.quests.get(id);
    if (quest) nodes.set(id, toNode(quest, 'in'));
  }

  for (const id of core) {
    const quest = index.quests.get(id);
    if (!quest) continue;
    for (const prerequisite of [...quest.requires, ...quest.selectable]) {
      if (coreSet.has(prerequisite) || nodes.has(prerequisite)) continue;
      const outside = index.quests.get(prerequisite);
      if (outside) nodes.set(prerequisite, toNode(outside, 'up'));
    }
    for (const unlocked of quest.unlocks) {
      if (coreSet.has(unlocked) || nodes.has(unlocked)) continue;
      const outside = index.quests.get(unlocked);
      if (outside) nodes.set(unlocked, toNode(outside, 'down'));
    }
  }

  const visible = new Set(nodes.keys());
  const edges: ChainScope['edges'] = [];
  for (const node of nodes.values()) {
    edges.push(...edgesFor(node, visible));
  }

  return {
    nodes: [...nodes.values()],
    edges,
    coreCount: core.length,
    omittedCount: all.length - core.length
  };
}

/**
 * The stretch of chain around one quest: every quest within MAX_CHAIN_HOPS of
 * it, plus one ring of context past that bound so the chain does not look like
 * it simply stops. Clicking a quest at the edge re-centres the walk on it,
 * which is how a reader follows the chain further.
 */
export function buildLineScope(index: ChainIndex, questId: number): ScopeResult {
  const seed = index.quests.get(questId);
  if (!seed) {
    return { nodes: [], edges: [], coreCount: 0, omittedCount: 0 };
  }

  const core = walkChain(index, questId, MAX_SCOPE_QUESTS, MAX_CHAIN_HOPS);
  const componentSize = walkChain(
    index,
    questId,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ).size;

  const nodes = new Map<number, ChainNode>();
  for (const id of core) {
    const quest = index.quests.get(id);
    if (quest) nodes.set(id, toNode(quest, 'in'));
  }

  // The ring is drawn the same way the chapter view draws quests from
  // neighbouring chapters, so it reads as "the chain carries on this way"
  // rather than as part of what was asked for. Every core quest is already in
  // the map, so nothing in the core can be demoted to context here.
  for (const id of core) {
    const quest = index.quests.get(id);
    if (!quest) continue;
    for (const prerequisite of [...quest.requires, ...quest.selectable]) {
      if (nodes.has(prerequisite)) continue;
      const outside = index.quests.get(prerequisite);
      if (outside) nodes.set(prerequisite, toNode(outside, 'up'));
    }
    for (const unlocked of quest.unlocks) {
      if (nodes.has(unlocked)) continue;
      const outside = index.quests.get(unlocked);
      if (outside) nodes.set(unlocked, toNode(outside, 'down'));
    }
  }

  const ordered = [...nodes.values()].sort((a, b) => a.id - b.id);
  const visible = new Set(nodes.keys());
  const edges: ChainScope['edges'] = [];
  for (const node of ordered) {
    edges.push(...edgesFor(node, visible));
  }

  return {
    nodes: ordered,
    edges,
    coreCount: core.size,
    omittedCount: Math.max(0, componentSize - nodes.size)
  };
}

/**
 * Breadth-first walk of the undirected prerequisite graph from one quest,
 * stopping at `maxHops` steps out or once `limit` quests have been collected.
 * Breadth first matters when either bound bites: what survives is the part of
 * the chain nearest the quest the reader asked about.
 */
function walkChain(
  index: ChainIndex,
  questId: number,
  limit: number,
  maxHops: number
): Set<number> {
  const hopsTo = new Map<number, number>([[questId, 0]]);
  const queue: number[] = [questId];
  for (let head = 0; head < queue.length; head++) {
    const hops = hopsTo.get(queue[head]) as number;
    // The queue is in non-decreasing hop order, so the first quest past the
    // bound means every quest after it is past the bound too.
    if (hops >= maxHops || hopsTo.size >= limit) break;
    const current = index.quests.get(queue[head]);
    if (!current) continue;
    for (const neighbour of [...current.requires, ...current.selectable, ...current.unlocks]) {
      if (hopsTo.has(neighbour)) continue;
      hopsTo.set(neighbour, hops + 1);
      queue.push(neighbour);
      if (hopsTo.size >= limit) break;
    }
  }
  return new Set(hopsTo.keys());
}

/** Everything the detail panel shows for one quest, including NPC names. */
export async function getQuestDetail(
  index: ChainIndex,
  questId: number
): Promise<ChainQuestDetail | null> {
  const quest = index.quests.get(questId);
  if (!quest) return null;

  const prisma = DBClient.getInstance().prisma;
  const row = await prisma.quests.findFirst({
    where: { id: questId },
    select: { startNpcId: true, completeNpcId: true }
  });

  const npcIds = [row?.startNpcId ?? 0, row?.completeNpcId ?? 0].filter((id) => id > 0);
  const npcs = npcIds.length
    ? await prisma.npcs.findMany({
        where: { id: { in: npcIds } },
        select: { id: true, name: true }
      })
    : [];
  const npcName = new Map(npcs.map((npc) => [npc.id, npc.name]));

  const name = (id: number) => index.quests.get(id)?.name ?? `Quest ${id}`;

  return {
    ...quest,
    startNpcId: row?.startNpcId ?? 0,
    startNpcName: npcName.get(row?.startNpcId ?? 0) ?? null,
    completeNpcId: row?.completeNpcId ?? 0,
    completeNpcName: npcName.get(row?.completeNpcId ?? 0) ?? null,
    requiredQuests: quest.requires.map((id) => ({ id, name: name(id) })),
    selectableQuests: quest.selectable.map((id) => ({ id, name: name(id) })),
    unlockedQuests: quest.unlocks.map((id) => ({ id, name: name(id) }))
  };
}
