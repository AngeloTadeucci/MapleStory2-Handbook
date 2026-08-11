import { redirect } from '@sveltejs/kit';
import {
  buildChapterScope,
  buildLineScope,
  getChainIndex,
  getQuestDetail,
  MAX_CHAIN_HOPS,
  MAX_GRAPH_NODES,
  MAX_SCOPE_QUESTS,
  NO_CHAPTER_ID,
  type ScopeResult
} from '$lib/server/questChapters';
import type { ChainQuestDetail, ChapterSummary } from '$lib/types/QuestChain';
import type { PageServerLoad } from './$types';

// SvelteKit only allows its own named exports from a +page.server.ts, so these
// stay module-private. The page component carries the same two bounds.
const LEVEL_MIN = 0;
const LEVEL_MAX = 99;
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

export type ChainView = 'graph' | 'table';
export type ChainMode = 'browse' | 'chapter' | 'line';

function readNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNumberList(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
}

function readStringList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function clampLevel(value: number | null, fallback: number): number {
  if (value === null) return fallback;
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(value)));
}

export const load = (async ({ url }) => {
  const index = await getChainIndex();

  const chapterId = readNumber(url.searchParams.get('chapter'));
  const questId = readNumber(url.searchParams.get('quest'));
  // A chain view is built by walking outwards from one quest. Without a root of
  // its own that quest would be whichever one is selected, so opening a quest's
  // details would rebuild the whole graph around it. The entry links may leave
  // root off and let the selection seed it; the page pins it on the first click.
  const rootId = readNumber(url.searchParams.get('root'));
  const wantsLine = url.searchParams.get('line') === '1';
  const view: ChainView = url.searchParams.get('view') === 'table' ? 'table' : 'graph';

  // /quests/chains?quest=123 is the entry point used by the quest detail page.
  // Resolve it to a canonical URL so the view is shareable and the browser's
  // back button lands somewhere meaningful.
  if (questId !== null && chapterId === null && !wantsLine) {
    const quest = index.quests.get(questId);
    if (quest && quest.chapterId !== null) {
      redirect(307, `/quests/chains?chapter=${quest.chapterId}&quest=${quest.id}`);
    }
    if (quest) {
      redirect(307, `/quests/chains?quest=${quest.id}&line=1`);
    }
  }

  const lineRoot = rootId ?? questId;
  const mode: ChainMode =
    wantsLine && lineRoot !== null ? 'line' : chapterId !== null ? 'chapter' : 'browse';

  const selected: ChainQuestDetail | null =
    mode === 'browse' || questId === null ? null : await getQuestDetail(index, questId);

  let scope: ScopeResult | null = null;
  let chapter: ChapterSummary | null = null;
  let root: { id: number; name: string; chapterId: number | null } | null = null;

  if (mode === 'line' && lineRoot !== null) {
    scope = buildLineScope(index, lineRoot);
    const quest = index.quests.get(lineRoot);
    root = quest ? { id: quest.id, name: quest.name, chapterId: quest.chapterId } : null;
    chapter = index.chapters.get(chapterId ?? root?.chapterId ?? -1) ?? null;
  } else if (mode === 'chapter' && chapterId !== null) {
    scope = buildChapterScope(index, chapterId);
    chapter = index.chapters.get(chapterId) ?? null;
  }

  // The tint each chapter on screen is drawn in. It comes from one colouring of
  // every chapter in the game, so a chapter looks the same in every view rather
  // than being recoloured around whatever else happens to be on screen. Only the
  // chapters in this scope are sent; the graph never asks about the others.
  const chapterTones: Record<number, number> = {};
  for (const node of scope?.nodes ?? []) {
    const nodeChapterId = node.chapterId ?? NO_CHAPTER_ID;
    chapterTones[nodeChapterId] = index.chapterTones.get(nodeChapterId) ?? 0;
  }

  const listing =
    mode === 'browse'
      ? browse(url, index.orderedChapters, index.quests)
      : {
          chapters: [] as ChapterSummary[],
          total: 0,
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          filters: emptyFilters()
        };

  return {
    mode,
    view,
    chapterId,
    questId,
    stats: index.stats,
    limits: {
      maxScopeQuests: MAX_SCOPE_QUESTS,
      maxGraphNodes: MAX_GRAPH_NODES,
      maxChainHops: MAX_CHAIN_HOPS
    },
    ...listing,
    scope,
    chapter,
    root,
    chapterTones,
    selected
  };
}) satisfies PageServerLoad;

function emptyFilters() {
  return {
    search: '',
    categories: [] as string[],
    questTypes: [] as number[],
    levelRange: [LEVEL_MIN, LEVEL_MAX] as number[]
  };
}

function browse(
  url: URL,
  chapters: ChapterSummary[],
  quests: ChainIndexQuests
): {
  chapters: ChapterSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  filters: ReturnType<typeof emptyFilters>;
} {
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
  const categories = readStringList(url.searchParams.get('category'));
  const questTypes = readNumberList(url.searchParams.get('questType'));
  const minLevel = clampLevel(readNumber(url.searchParams.get('minLevel')), LEVEL_MIN);
  const maxLevel = clampLevel(readNumber(url.searchParams.get('maxLevel')), LEVEL_MAX);
  const levelFiltered = minLevel !== LEVEL_MIN || maxLevel !== LEVEL_MAX;

  const categorySet = new Set(categories);
  const questTypeSet = new Set(questTypes);

  const questsByChapter = new Map<number, string[]>();
  if (search) {
    for (const quest of quests.values()) {
      if (quest.chapterId === null) continue;
      const bucket = questsByChapter.get(quest.chapterId);
      const entry = `${quest.name.toLowerCase()} ${quest.id}`;
      if (bucket) bucket.push(entry);
      else questsByChapter.set(quest.chapterId, [entry]);
    }
  }

  const matched = chapters.filter((chapter) => {
    if (categorySet.size > 0 && !categorySet.has(chapter.category)) return false;
    if (questTypeSet.size > 0 && !chapter.questTypes.some((type) => questTypeSet.has(type))) {
      return false;
    }
    if (levelFiltered) {
      if (chapter.minLevel === null || chapter.maxLevel === null) return false;
      if (chapter.maxLevel < minLevel || chapter.minLevel > maxLevel) return false;
    }
    if (search) {
      const nameMatch =
        chapter.name.toLowerCase().includes(search) || String(chapter.id).includes(search);
      if (nameMatch) return true;
      const questMatch = (questsByChapter.get(chapter.id) ?? []).some((entry) =>
        entry.includes(search)
      );
      if (!questMatch) return false;
    }
    return true;
  });

  const requestedSize = readNumber(url.searchParams.get('limit'));
  const pageSize =
    requestedSize !== null && PAGE_SIZE_OPTIONS.includes(requestedSize)
      ? requestedSize
      : DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const requestedPage = readNumber(url.searchParams.get('page'));
  const page = Math.min(pageCount, Math.max(1, (requestedPage ?? 0) + 1));

  return {
    chapters: matched.slice((page - 1) * pageSize, page * pageSize),
    total: matched.length,
    page,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    filters: {
      search: url.searchParams.get('search') ?? '',
      categories,
      questTypes,
      levelRange: [minLevel, maxLevel]
    }
  };
}

type ChainIndexQuests = Awaited<ReturnType<typeof getChainIndex>>['quests'];
