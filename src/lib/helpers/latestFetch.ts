export type LatestFetchResult<T> =
  { status: 'ok'; data: T } | { status: 'aborted' } | { status: 'error' };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Runs JSON requests where only the newest one matters. Starting a request aborts the previous
 * one, and a superseded or cancelled request resolves as 'aborted' so the caller can leave its
 * loading and error state to the request that replaced it.
 */
export function createLatestFetch(fetchFn: typeof fetch = (...args) => fetch(...args)) {
  let controller: AbortController | undefined;

  async function fetchJson<T>(url: string): Promise<LatestFetchResult<T>> {
    controller?.abort();
    const own = new AbortController();
    controller = own;

    try {
      const response = await fetchFn(url, { signal: own.signal });
      if (!response.ok) {
        return { status: 'error' };
      }
      const data = (await response.json()) as T;
      if (own.signal.aborted) {
        return { status: 'aborted' };
      }
      return { status: 'ok', data };
    } catch (error) {
      if (own.signal.aborted || isAbortError(error)) {
        return { status: 'aborted' };
      }
      return { status: 'error' };
    } finally {
      if (controller === own) {
        controller = undefined;
      }
    }
  }

  function abort() {
    controller?.abort();
    controller = undefined;
  }

  return { fetchJson, abort };
}
