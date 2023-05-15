import paramsBuilder from '$lib/helpers/paramsBuilder';
import { test, expect } from 'vitest';

test('paramsBuilder should build a query string with parameters', async () => {
	const params = [
		{ name: 'name', value: 'John' },
		{ name: 'age', value: 30 },
		{ name: 'gender', value: 'male' },
		{ name: 'email', value: null },
		{ name: 'city', value: undefined },
		{ name: 'zipcode', value: '' }
	];

	const result = paramsBuilder(params);

	expect(result).toBe('?name=John&age=30&gender=male');
});

test('paramsBuilder should build a query string without parameters', async () => {
	const params = [
		{ name: 'email', value: null },
		{ name: 'city', value: undefined },
		{ name: 'zipcode', value: '' }
	];

	const result = paramsBuilder(params);

	expect(result).toBe('?');
});
