import { closeMissingTags } from '$lib/helpers/htmlParser';
import { test, expect } from 'vitest';

test('closeMissingTags', () => {
	expect(closeMissingTags('<div><p>Some text<p>More text')).toBe(
		'<div><p>Some text<p>More text</p></p></div>'
	);

	expect(closeMissingTags('<img src="example.png"><br>')).toBe('<img src="example.png"><br></img>');

	expect(closeMissingTags('<div><p>Some text<div>More text</div></p></div>')).toBe(
		'<div><p>Some text<div>More text</div></p></div>'
	);

	expect(closeMissingTags('<font color="red">Some text</font>', true)).toBe(
		'<font color="white">Some text</font>'
	);
});
