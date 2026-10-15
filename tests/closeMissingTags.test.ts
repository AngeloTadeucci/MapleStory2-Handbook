import { closeMissingTags } from '$lib/helpers/htmlParser';
import { test, expect } from 'vitest';

test('closeMissingTags keeps an unterminated tag as text and does not hang', () => {
  expect(closeMissingTags('abc <b')).toBe('abc <b');
  expect(closeMissingTags('<')).toBe('<');
  expect(closeMissingTags('<font')).toBe('<font');
  expect(closeMissingTags('<font color="red"')).toBe('<font color="red"');
  expect(closeMissingTags('<font color="red"', true)).toBe('<font color="red"');
  expect(closeMissingTags('<font', true)).toBe('<font');
  expect(closeMissingTags('<font color="red" size')).toBe('<font color="red" size');
});

test('closeMissingTags still closes tags opened before an unterminated tail', () => {
  expect(closeMissingTags('<b>bold <i')).toBe('<b>bold <i</b>');
  expect(closeMissingTags('<p>text<font color="red"', true)).toBe('<p>text<font color="red"</p>');
  expect(closeMissingTags('<b>bold <i class="x"')).toBe('<b>bold <i class="x"</b>');
});

test('closeMissingTags returns promptly on a long unterminated tail', () => {
  const start = Date.now();
  const result = closeMissingTags(`<b>${'<font '.repeat(5000)}`);
  expect(result.endsWith('</b>')).toBe(true);
  expect(Date.now() - start).toBeLessThan(1000);
});

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
