import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  items: { findFirst: vi.fn(), findMany: vi.fn() },
  npcs: { findFirst: vi.fn() },
  maps: { findFirst: vi.fn(), findUnique: vi.fn() },
  quests: { findFirst: vi.fn(), findMany: vi.fn() },
  achieves: { findFirst: vi.fn() },
  additional_effects: { findMany: vi.fn() },
  furnishing_shop: { findUnique: vi.fn() },
  bgm_tracks: { findFirst: vi.fn() },
  $queryRaw: vi.fn()
}));
vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: db }) }
}));
vi.mock('$lib/server/questLinks', () => ({
  getRequiredByQuests: vi.fn(async () => []),
  getRewardedByQuests: vi.fn(async () => []),
  getRequiredForQuests: vi.fn(async () => []),
  getQuestObjectives: vi.fn(async () => [])
}));

import { load as itemLoad } from '../src/routes/items/[slug]/+page.server';
import { load as npcLoad } from '../src/routes/npcs/[slug]/+page.server';
import { load as npcModelLoad } from '../src/routes/npcs/[slug]/model/+page.server';
import { load as mapLoad } from '../src/routes/maps/[slug]/+page.server';
import { load as questLoad } from '../src/routes/quests/[slug]/+page.server';
import { load as trophyLoad } from '../src/routes/trophies/[slug]/+page.server';
import { load as storybookLoad } from '../src/routes/storybooks/[slug]/+page.server';
import { load as storybookLangLoad } from '../src/routes/storybooks/[slug]/[lang]/+page.server';
import { storyBooks } from '../src/lib/storyBooks';

type Loader = (event: never) => unknown;
const run = (loader: unknown, params: Record<string, string>) =>
  Promise.resolve((loader as Loader)({ params } as never));

const prismaLoaders: Array<[string, unknown]> = [
  ['items', itemLoad],
  ['npcs', npcLoad],
  ['npc model', npcModelLoad],
  ['maps', mapLoad],
  ['quests', questLoad],
  ['trophies', trophyLoad]
];

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: 'Item',
    box_id: 0,
    additional_effects: '',
    housing_category: 0,
    is_outfit: 0,
    ...overrides
  };
}

function questRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    name: 'Quest',
    startNpcId: 0,
    completeNpcId: 0,
    startRewards: null,
    completeRewards: null,
    requiredQuest: [],
    selectableQuest: [],
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.items.findFirst.mockResolvedValue(null);
  db.items.findMany.mockResolvedValue([]);
  db.npcs.findFirst.mockResolvedValue(null);
  db.maps.findFirst.mockResolvedValue(null);
  db.quests.findFirst.mockResolvedValue(null);
  db.quests.findMany.mockResolvedValue([]);
  db.achieves.findFirst.mockResolvedValue(null);
  db.additional_effects.findMany.mockResolvedValue([]);
  db.furnishing_shop.findUnique.mockResolvedValue(null);
  db.bgm_tracks.findFirst.mockResolvedValue(null);
  db.maps.findUnique.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([]);
});

describe.each(prismaLoaders)('%s page loader', (_name, loader) => {
  it.each(['abc', '12abc', '', '-1', '1.5', '1e3', '99999999999'])(
    'responds 404 to the slug %j without querying',
    async (slug) => {
      await expect(run(loader, { slug })).rejects.toMatchObject({ status: 404 });
      expect(db.$queryRaw).not.toHaveBeenCalled();
    }
  );

  it('responds 404 when the record does not exist', async () => {
    await expect(run(loader, { slug: '123' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('storybook loaders', () => {
  const [bookId] = Object.keys(storyBooks);
  const [lang] = Object.keys(storyBooks[Number(bookId)]);

  it('responds 404 to a non numeric book slug', async () => {
    await expect(run(storybookLoad, { slug: 'abc' })).rejects.toMatchObject({ status: 404 });
    await expect(run(storybookLangLoad, { slug: 'abc', lang })).rejects.toMatchObject({
      status: 404
    });
  });

  it('responds 404 to an unknown book', async () => {
    await expect(run(storybookLoad, { slug: '1' })).rejects.toMatchObject({ status: 404 });
    await expect(run(storybookLangLoad, { slug: '1', lang })).rejects.toMatchObject({
      status: 404
    });
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'responds 404 to the inherited language key %s',
    async (key) => {
      await expect(run(storybookLangLoad, { slug: bookId, lang: key })).rejects.toMatchObject({
        status: 404
      });
    }
  );

  it('responds 404 to a language the book does not have', async () => {
    await expect(run(storybookLangLoad, { slug: bookId, lang: 'zz' })).rejects.toMatchObject({
      status: 404
    });
  });

  it('still returns the images of a real book', async () => {
    const result = await run(storybookLangLoad, { slug: bookId, lang });
    expect(result).toMatchObject({
      props: { bookId: Number(bookId), lang, images: storyBooks[Number(bookId)][lang] }
    });
  });
});

describe('item loader', () => {
  it('skips the box query when box_id is 0', async () => {
    db.items.findFirst.mockResolvedValue(itemRow({ box_id: 0 }));
    const result = (await run(itemLoad, { slug: '5' })) as {
      props: { boxContent: unknown[] };
    };
    expect(result.props.boxContent).toEqual([]);
    const sql = db.$queryRaw.mock.calls.map(([strings]) => (strings as string[]).join(' '));
    expect(sql.some((text) => text.includes('item_boxes'))).toBe(false);
  });

  it('runs the box query when box_id is set', async () => {
    db.items.findFirst.mockResolvedValue(itemRow({ box_id: 330001414 }));
    await run(itemLoad, { slug: '5' });
    const sql = db.$queryRaw.mock.calls.map(([strings]) => (strings as string[]).join(' '));
    expect(sql.some((text) => text.includes('item_boxes'))).toBe(true);
  });

  it.each(['{not json', '{"Item1":1}', 'null', '[1,null,{"Item2":3},{"Item1":"x"}]'])(
    'does not throw on the malformed additional_effects %j',
    async (additional_effects) => {
      db.items.findFirst.mockResolvedValue(itemRow({ additional_effects }));
      const result = (await run(itemLoad, { slug: '5' })) as {
        props: { additionalEffectDescriptions: unknown[] };
      };
      expect(result.props.additionalEffectDescriptions).toEqual([]);
    }
  );

  it('looks effects up in one query and keeps order, duplicates and gaps', async () => {
    db.items.findFirst.mockResolvedValue(
      itemRow({
        additional_effects: JSON.stringify([
          { Item1: 30, Item2: 1 },
          { Item1: 10, Item2: 1 },
          { Item1: 99, Item2: 1 },
          { Item1: 30, Item2: 2 }
        ])
      })
    );
    db.additional_effects.findMany.mockResolvedValue([
      { id: 10, name: 'ten' },
      { id: 30, name: 'thirty' }
    ]);
    const result = (await run(itemLoad, { slug: '5' })) as {
      props: { additionalEffectDescriptions: unknown[] };
    };
    expect(db.additional_effects.findMany).toHaveBeenCalledTimes(1);
    expect(db.additional_effects.findMany).toHaveBeenCalledWith({
      where: { id: { in: [30, 10, 99] } }
    });
    expect(result.props.additionalEffectDescriptions).toEqual([
      { id: 30, name: 'thirty' },
      { id: 10, name: 'ten' },
      { id: 30, name: 'thirty' }
    ]);
  });
});

describe('trophy loader', () => {
  const trophyRow = (grades: string) => ({ id: 3, name: 'Trophy', grades });

  it.each(['{not json', '{"grade":1}', 'null', '"text"'])(
    'degrades the malformed grades %j to an empty list',
    async (grades) => {
      db.achieves.findFirst.mockResolvedValue(trophyRow(grades));
      const result = (await run(trophyLoad, { slug: '3' })) as {
        props: { trophy: { grades: unknown[] } };
      };
      expect(result.props.trophy.grades).toEqual([]);
    }
  );

  it('parses valid grades', async () => {
    db.achieves.findFirst.mockResolvedValue(trophyRow('[{"grade":1}]'));
    const result = (await run(trophyLoad, { slug: '3' })) as {
      props: { trophy: { grades: unknown[] } };
    };
    expect(result.props.trophy.grades).toEqual([{ grade: 1 }]);
  });
});

describe('quest loader', () => {
  it('fills reward items from one query, including duplicates and missing items', async () => {
    const reward = (Id: number) => ({ Id, Amount: 1, Rarity: 1 });
    db.quests.findFirst.mockResolvedValue(
      questRow({
        startRewards: { EssentialItem: [reward(1), reward(2)], EssentialJobItem: [] },
        completeRewards: { EssentialItem: [reward(1)], EssentialJobItem: [reward(404)] }
      })
    );
    db.items.findMany.mockResolvedValue([
      { id: 1, name: 'one', icon_path: 'one.png', is_outfit: 1 },
      { id: 2, name: 'two', icon_path: 'two.png', is_outfit: 0 }
    ]);
    const result = (await run(questLoad, { slug: '7' })) as {
      props: {
        quest: {
          startRewards: { EssentialItem: Array<Record<string, unknown>> };
          completeRewards: {
            EssentialItem: Array<Record<string, unknown>>;
            EssentialJobItem: Array<Record<string, unknown>>;
          };
        };
      };
    };
    expect(db.items.findMany).toHaveBeenCalledTimes(1);
    const { startRewards, completeRewards } = result.props.quest;
    expect(startRewards.EssentialItem).toEqual([
      { Id: 1, Amount: 1, Rarity: 1, Name: 'one', IconPath: 'one.png', IsOutfit: true },
      { Id: 2, Amount: 1, Rarity: 1, Name: 'two', IconPath: 'two.png', IsOutfit: false }
    ]);
    expect(completeRewards.EssentialItem[0]).toMatchObject({ Id: 1, Name: 'one' });
    expect(completeRewards.EssentialJobItem).toEqual([reward(404)]);
  });

  it('links required and selectable quests in list order with duplicates and gaps', async () => {
    db.quests.findFirst.mockResolvedValue(
      questRow({ requiredQuest: [3, 1, 99, 3], selectableQuest: [8] })
    );
    db.quests.findMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) =>
      where.id.in.filter((id) => id !== 99).map((id) => ({ id, name: `q${id}` }))
    );
    const result = (await run(questLoad, { slug: '7' })) as {
      props: { quest: { requiredQuest: unknown; selectableQuest: unknown } };
    };
    expect(db.quests.findMany).toHaveBeenCalledTimes(2);
    expect(result.props.quest.requiredQuest).toEqual([
      { Id: 3, Name: 'q3' },
      { Id: 1, Name: 'q1' },
      { Id: 3, Name: 'q3' }
    ]);
    expect(result.props.quest.selectableQuest).toEqual([{ Id: 8, Name: 'q8' }]);
  });

  it('does not query when there is nothing to look up', async () => {
    db.quests.findFirst.mockResolvedValue(questRow());
    await run(questLoad, { slug: '7' });
    expect(db.quests.findMany).not.toHaveBeenCalled();
    expect(db.items.findMany).not.toHaveBeenCalled();
  });
});
