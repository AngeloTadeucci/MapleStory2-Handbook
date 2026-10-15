import { describe, expect, it } from 'vitest';
import { MAX_PAGE_SIZE, parsePagination } from '../src/lib/server/pagination';

function parse(query: string, defaultLimit = 20, maxLimit?: number) {
  return parsePagination(new URLSearchParams(query), defaultLimit, maxLimit);
}

describe('parsePagination', () => {
  it('uses the default limit and page 0 when nothing is given', () => {
    expect(parse('')).toEqual({ limit: 20, offset: 0 });
    expect(parse('', 50)).toEqual({ limit: 50, offset: 0 });
  });

  it('reads a valid limit and page', () => {
    expect(parse('limit=25&page=3')).toEqual({ limit: 25, offset: 75 });
    expect(parse('limit=%2025%20&page=%203')).toEqual({ limit: 25, offset: 75 });
  });

  it('falls back to the defaults on garbage and empty input', () => {
    for (const bad of ['abc', '', ' ', 'NaN', 'Infinity', '1e3', '0x10', '12px', '--5', 'null']) {
      const encoded = encodeURIComponent(bad);
      expect(parse(`limit=${encoded}&page=${encoded}`)).toEqual({ limit: 20, offset: 0 });
    }
  });

  it('falls back on floats instead of truncating them', () => {
    expect(parse('limit=2.5&page=1.5')).toEqual({ limit: 20, offset: 0 });
  });

  it('clamps a negative or zero limit up to 1', () => {
    expect(parse('limit=-5')).toEqual({ limit: 1, offset: 0 });
    expect(parse('limit=0&page=4')).toEqual({ limit: 1, offset: 4 });
  });

  it('clamps a negative page to 0', () => {
    expect(parse('limit=10&page=-3')).toEqual({ limit: 10, offset: 0 });
  });

  it('clamps a huge limit to the cap', () => {
    expect(parse('limit=99999999999999999999')).toEqual({ limit: MAX_PAGE_SIZE, offset: 0 });
    expect(parse('limit=201')).toEqual({ limit: 200, offset: 0 });
    expect(parse('limit=200')).toEqual({ limit: 200, offset: 0 });
  });

  it('honours a lower cap for endpoints that pass one', () => {
    expect(parse('limit=150', 50, 100)).toEqual({ limit: 100, offset: 0 });
  });

  it('keeps a huge page inside a safe offset', () => {
    const { offset } = parse('limit=200&page=99999999999999999999');
    expect(Number.isSafeInteger(offset)).toBe(true);
    expect(offset).toBe(200_000_000);
  });
});
