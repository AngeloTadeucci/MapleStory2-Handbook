import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { handle } from '../src/hooks.server';

const event = {} as RequestEvent;

function run(response: Response) {
  return handle({ event, resolve: async () => response });
}

describe('handle security headers', () => {
  test('sets the three headers on a normal response', async () => {
    const response = await run(new Response('x'));
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(await response.text()).toBe('x');
  });

  test('does not add a Content-Security-Policy header', async () => {
    const response = await run(new Response('x'));
    expect(response.headers.has('Content-Security-Policy')).toBe(false);
  });

  test('keeps status and existing headers', async () => {
    const response = await run(
      new Response('nope', { status: 404, headers: { 'Content-Type': 'text/plain' } })
    );
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
  });

  test('applies the headers to a response with immutable headers', async () => {
    const response = await run(Response.redirect('https://example.com/', 302));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://example.com/');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  test('does not throw on a response that cannot be rebuilt', async () => {
    const original = Response.error();
    await expect(run(original)).resolves.toBe(original);
  });
});
