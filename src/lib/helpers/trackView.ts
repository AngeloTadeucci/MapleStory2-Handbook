export const VIEW_COUNT_DELAY_MS = 2000;

type TrackViewOptions = {
  delayMs?: number;
  fetchFn?: typeof fetch;
};

/**
 * Posts one view count for a record after a delay and returns a function that cancels the
 * pending post. Return it from a `$effect` that reads the record id, so each record gets its own
 * timer and the previous record's timer is cleared when the id changes or the page unmounts.
 * A post that has already been sent is not aborted.
 */
export function trackView(
  endpoint: string,
  id: number | string,
  { delayMs = VIEW_COUNT_DELAY_MS, fetchFn = (...args) => fetch(...args) }: TrackViewOptions = {}
): () => void {
  const timer = setTimeout(() => {
    void fetchFn(`${endpoint}?id=${encodeURIComponent(String(id))}`, { method: 'POST' }).catch(
      () => {}
    );
  }, delayMs);

  return () => clearTimeout(timer);
}
