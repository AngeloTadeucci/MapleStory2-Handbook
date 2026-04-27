import { describe, expect, test } from 'vitest';
import {
	getHousingCategoryLabel,
	getHousingTokenLabel,
	isHousingCategory,
	parseHousingFilterNumber
} from '$lib/helpers/housing';

describe('housing helpers', () => {
	test('formats known housing categories', () => {
		expect(getHousingCategoryLabel(1)).toBe('Bed');
		expect(getHousingCategoryLabel(3)).toBe('Sofas & Chairs');
		expect(getHousingCategoryLabel(10000)).toBe('Misc');
	});

	test('formats unknown housing categories with the numeric id', () => {
		expect(getHousingCategoryLabel(777)).toBe('Category 777');
	});

	test('detects valid category filters', () => {
		expect(isHousingCategory(1)).toBe(true);
		expect(isHousingCategory(204)).toBe(true);
		expect(isHousingCategory(777)).toBe(false);
	});

	test('formats furnishing token labels', () => {
		expect(getHousingTokenLabel(0)).toBe('Meso');
		expect(getHousingTokenLabel(1)).toBe('Meret');
		expect(getHousingTokenLabel(9)).toBe('Token 9');
	});

	test('parses integer filters safely', () => {
		expect(parseHousingFilterNumber('91')).toBe(91);
		expect(parseHousingFilterNumber('')).toBeNull();
		expect(parseHousingFilterNumber(null)).toBeNull();
		expect(parseHousingFilterNumber('1 OR 1=1')).toBeNull();
		expect(parseHousingFilterNumber('1.5')).toBeNull();
	});
});
