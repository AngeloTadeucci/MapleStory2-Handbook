/**
 * Parses a JSON text column, returning `fallback` when the text is empty,
 * malformed, or fails the shape check. A bad row must not take the page down.
 */
export function parseJsonColumn<T>(
  raw: string | null | undefined,
  isValid: (value: unknown) => value is T,
  fallback: T
): T {
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
