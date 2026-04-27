import { describe, expect, test } from 'vitest';
import { formatDropCount, getDropTypeLabel } from '$lib/helpers/drops';

describe('drops helpers', () => {
  test('labels known drop types', () => {
    expect(getDropTypeLabel(0)).toBe('On Death');
    expect(getDropTypeLabel(1)).toBe('On Hit');
  });

  test('falls back to numeric label for unknown drop types', () => {
    expect(getDropTypeLabel(7)).toBe('Type 7');
  });

  test('formats single drop count', () => {
    expect(formatDropCount(1, 1)).toBe('1');
    expect(formatDropCount(5, 5)).toBe('5');
  });

  test('formats drop count range', () => {
    expect(formatDropCount(1, 3)).toBe('1 ~ 3');
    expect(formatDropCount(10, 25)).toBe('10 ~ 25');
  });

  test('treats max < min as a single value', () => {
    expect(formatDropCount(5, 0)).toBe('5');
  });
});
