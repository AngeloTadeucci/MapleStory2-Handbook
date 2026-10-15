import { expect, test, vi } from 'vitest';
import { createLatestFetch } from '$lib/helpers/latestFetch';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/** A fetch that stays pending until its signal aborts, like a slow network request. */
function hangingFetch() {
  return vi.fn<typeof fetch>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })
  );
}

test('returns the parsed body of a successful request', async () => {
  const fetchFn = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ total: 3 })));
  const latest = createLatestFetch(fetchFn);

  await expect(latest.fetchJson<{ total: number }>('/api/items')).resolves.toEqual({
    status: 'ok',
    data: { total: 3 }
  });
  expect(fetchFn.mock.calls[0][0]).toBe('/api/items');
});

test('reports a non-OK response as an error', async () => {
  const latest = createLatestFetch(() => Promise.resolve(jsonResponse({ error: 'x' }, 500)));

  await expect(latest.fetchJson('/api/items')).resolves.toEqual({ status: 'error' });
});

test('reports a network failure as an error', async () => {
  const latest = createLatestFetch(() => Promise.reject(new TypeError('Failed to fetch')));

  await expect(latest.fetchJson('/api/items')).resolves.toEqual({ status: 'error' });
});

test('reports an unparsable body as an error', async () => {
  const latest = createLatestFetch(() => Promise.resolve(new Response('<html>', { status: 200 })));

  await expect(latest.fetchJson('/api/items')).resolves.toEqual({ status: 'error' });
});

test('starting a new request aborts the previous one', async () => {
  const fetchFn = hangingFetch();
  const latest = createLatestFetch(fetchFn);

  const first = latest.fetchJson('/api/items?search=a');
  const second = latest.fetchJson('/api/items?search=ab');

  await expect(first).resolves.toEqual({ status: 'aborted' });
  expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(fetchFn.mock.calls[1][1]?.signal?.aborted).toBe(false);

  latest.abort();
  await expect(second).resolves.toEqual({ status: 'aborted' });
});

test('a superseded request that still resolves is reported as aborted', async () => {
  let resolveFirst: (response: Response) => void = () => {};
  const fetchFn = vi
    .fn<typeof fetch>()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    )
    .mockImplementationOnce(() => Promise.resolve(jsonResponse({ n: 2 })));
  const latest = createLatestFetch(fetchFn);

  const first = latest.fetchJson<{ n: number }>('/a');
  const second = latest.fetchJson<{ n: number }>('/b');
  resolveFirst(jsonResponse({ n: 1 }));

  await expect(first).resolves.toEqual({ status: 'aborted' });
  await expect(second).resolves.toEqual({ status: 'ok', data: { n: 2 } });
});

test('abort cancels the in-flight request', async () => {
  const latest = createLatestFetch(hangingFetch());

  const pending = latest.fetchJson('/api/items');
  latest.abort();

  await expect(pending).resolves.toEqual({ status: 'aborted' });
});

test('abort with nothing in flight does nothing', () => {
  const latest = createLatestFetch(hangingFetch());

  expect(() => latest.abort()).not.toThrow();
});
