import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());
const queries = vi.hoisted(() => ({
  getDroppedBy: vi.fn(),
  getBoxContent: vi.fn(),
  getRequiredByQuests: vi.fn(),
  getRewardedByQuests: vi.fn()
}));

vi.mock('$lib/prismaClient', () => ({
  default: { getInstance: () => ({ prisma: { items: { findFirst } } }) }
}));
vi.mock('$lib/server/itemDrops', () => ({
  getDroppedBy: queries.getDroppedBy,
  getBoxContent: queries.getBoxContent
}));
vi.mock('$lib/server/questLinks', () => ({
  getRequiredByQuests: queries.getRequiredByQuests,
  getRewardedByQuests: queries.getRewardedByQuests
}));

import { GET } from '../src/routes/api/items/[id]/+server';
type ItemRequest = Parameters<typeof GET>[0];

function get(id: string) {
  return GET({ params: { id } } as unknown as ItemRequest);
}

beforeEach(() => {
  findFirst.mockReset();
  for (const query of Object.values(queries)) query.mockReset().mockResolvedValue([]);
});

describe('GET /api/items/[id]', () => {
  it('returns where the item comes from and what uses it', async () => {
    findFirst.mockResolvedValue({ id: 20000001, name: 'Old Box', rarity: 2, box_id: 7 });
    queries.getDroppedBy.mockResolvedValue([
      { id: 21000001, name: 'Boss Mob', portrait: 'p.png', is_boss: 1, level: 50, drop_type: 0 },
      { id: 21000002, name: 'Small Mob', portrait: 'p.png', is_boss: 0, level: 10, drop_type: 1 }
    ]);
    queries.getRequiredByQuests.mockResolvedValue([
      { id: 10000001, name: 'Fetch Quest', questType: 0, requiredLevel: 12 }
    ]);
    queries.getRewardedByQuests.mockResolvedValue([
      {
        id: 10000002,
        name: 'Reward Quest',
        questType: 0,
        requiredLevel: 5,
        reward_kind: 'complete',
        count: 3
      }
    ]);
    queries.getBoxContent.mockResolvedValue([
      { item_id: 30000001, name: 'Potion', rarity: 1, min_count: 1, max_count: 5 }
    ]);

    const response = await get('20000001');

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 20000001 } }));
    expect(queries.getBoxContent).toHaveBeenCalledWith(expect.anything(), 7);
    // Labels and the count range come from the helpers in tests/drops.test.ts.
    expect(await response.json()).toEqual({
      id: 20000001,
      name: 'Old Box',
      rarity: 2,
      droppedBy: [
        { id: 21000001, name: 'Boss Mob', level: 50, isBoss: true, dropType: 'On Death' },
        { id: 21000002, name: 'Small Mob', level: 10, isBoss: false, dropType: 'On Hit' }
      ],
      requiredByQuests: [{ id: 10000001, name: 'Fetch Quest', requiredLevel: 12 }],
      rewardedByQuests: [{ id: 10000002, name: 'Reward Quest', rewardKind: 'complete', count: 3 }],
      boxContent: [{ id: 30000001, name: 'Potion', rarity: 1, count: '1 ~ 5' }]
    });
  });

  it('answers 404 for an item that does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(get('99999999')).rejects.toMatchObject({ status: 404 });
  });

  it('answers 404 for an id that is not a number, without querying', async () => {
    await expect(get('1 OR 1=1')).rejects.toMatchObject({ status: 404 });
    await expect(get('99999999999')).rejects.toMatchObject({ status: 404 });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
