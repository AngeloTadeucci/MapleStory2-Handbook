import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { trackView, VIEW_COUNT_DELAY_MS } from '$lib/helpers/trackView';

function okFetch() {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('trackView posts the id once after the delay', () => {
  const fetchFn = okFetch();
  trackView('/api/npcs', 12, { fetchFn });

  vi.advanceTimersByTime(VIEW_COUNT_DELAY_MS - 1);
  expect(fetchFn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(fetchFn).toHaveBeenCalledWith('/api/npcs?id=12', { method: 'POST' });

  vi.advanceTimersByTime(VIEW_COUNT_DELAY_MS * 5);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test('trackView cancel prevents the post', () => {
  const fetchFn = okFetch();
  const cancel = trackView('/api/maps', 5, { fetchFn });

  vi.advanceTimersByTime(VIEW_COUNT_DELAY_MS - 1);
  cancel();
  vi.advanceTimersByTime(VIEW_COUNT_DELAY_MS * 5);

  expect(fetchFn).not.toHaveBeenCalled();
});

test('cancelling the previous record and tracking a new one posts only the new id', () => {
  const fetchFn = okFetch();

  const cancelFirst = trackView('/api/maps', 1, { fetchFn });
  vi.advanceTimersByTime(1000);

  // This is what a $effect does when the reactive id changes.
  cancelFirst();
  trackView('/api/maps', 2, { fetchFn });

  vi.advanceTimersByTime(VIEW_COUNT_DELAY_MS);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(fetchFn).toHaveBeenCalledWith('/api/maps?id=2', { method: 'POST' });
});

test('trackView gives every record its own timer when none are cancelled', () => {
  const fetchFn = okFetch();

  trackView('/api/quests', 1, { fetchFn });
  vi.advanceTimersByTime(500);
  trackView('/api/quests', 2, { fetchFn });
  vi.advanceTimersByTime(VIEW_COUNT_DELAY_MS);

  expect(fetchFn.mock.calls.map(([url]) => url)).toEqual(['/api/quests?id=1', '/api/quests?id=2']);
});

test('trackView swallows a rejected post', async () => {
  const fetchFn = vi.fn<typeof fetch>(() => Promise.reject(new Error('offline')));
  trackView('/api/items', 3, { fetchFn });

  await vi.advanceTimersByTimeAsync(VIEW_COUNT_DELAY_MS);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test('trackView honours a custom delay', () => {
  const fetchFn = okFetch();
  trackView('/api/trophies', 9, { fetchFn, delayMs: 50 });

  vi.advanceTimersByTime(50);
  expect(fetchFn).toHaveBeenCalledWith('/api/trophies?id=9', { method: 'POST' });
});
