import { describe, expect, it } from 'vitest';
import { inListCondition, parseIntList } from '../src/lib/server/sqlFilters';

describe('parseIntList', () => {
  it('keeps integers and drops everything else', () => {
    expect(parseIntList('1, 2,3')).toEqual([1, 2, 3]);
    expect(parseIntList('-1,4')).toEqual([-1, 4]);
    expect(parseIntList('1) OR 1=1 -- ,2')).toEqual([2]);
    expect(parseIntList('1.5,abc,')).toEqual([]);
    expect(parseIntList(null)).toEqual([]);
  });
});

describe('inListCondition', () => {
  it('binds every value instead of splicing it into the SQL', () => {
    const condition = inListCondition('rarity', '1,2,3');
    expect(condition.sql).toBe(' AND rarity IN (?,?,?)');
    expect(condition.values).toEqual([1, 2, 3]);
  });

  it('leaves no trace of an injection payload in the SQL text', () => {
    const condition = inListCondition(
      'rarity',
      '1,2,3,4,5,6) AND ASCII(SUBSTR((SELECT user()),1,1))>64 AND (1'
    );
    expect(condition.sql).toBe(' AND rarity IN (?,?,?,?,?,?)');
    expect(condition.values).toEqual([1, 2, 3, 4, 5, 1]);
  });

  it('matches nothing when the param holds no integers, and nothing extra when absent', () => {
    expect(inListCondition('gender', 'abc').sql).toBe(' AND 1 = 0');
    expect(inListCondition('gender', null).sql).toBe('');
  });
});
