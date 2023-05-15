import { unescapeHtml } from '$lib/helpers/htmlParser';
import { test, expect } from 'vitest';

test('unescapeHtml', () => {
	test('should replace &nbsp; with a space', () => {
		const input = 'Hello&nbsp;world';
		const expected = 'Hello world';
		const result = unescapeHtml(input);
		expect(result).toEqual(expected);
	});

	test('should replace &amp; with &', () => {
		const input = 'AT&amp;T';
		const expected = 'AT&T';
		const result = unescapeHtml(input);
		expect(result).toEqual(expected);
	});

	test('should replace &quot; with "', () => {
		const input = 'She said, &quot;Hello!&quot;';
		const expected = 'She said, "Hello!"';
		const result = unescapeHtml(input);
		expect(result).toEqual(expected);
	});

	test('should replace &lt; with <', () => {
		const input = '3 &lt; 5';
		const expected = '3 < 5';
		const result = unescapeHtml(input);
		expect(result).toEqual(expected);
	});

	test('should replace &gt; with >', () => {
		const input = '5 &gt; 3';
		const expected = '5 > 3';
		const result = unescapeHtml(input);
		expect(result).toEqual(expected);
	});
});
