// The list pages offer page sizes up to 200, so that is the cap for every search endpoint
// whose UI requests it. Endpoints without a UI caller pass a lower cap.
export const MAX_PAGE_SIZE = 200;

// Keeps page * limit well inside what the database accepts as an OFFSET.
const MAX_PAGE = 1_000_000;

function parseInteger(value: string | null): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Reads `limit` and `page` from the query string as integers. Missing, empty or
 * non-integer input falls back to the default limit and page 0, so the values are always
 * safe to bind into LIMIT and OFFSET.
 */
export function parsePagination(
  params: URLSearchParams,
  defaultLimit: number,
  maxLimit: number = MAX_PAGE_SIZE
): { limit: number; offset: number } {
  const rawLimit = parseInteger(params.get('limit'));
  const rawPage = parseInteger(params.get('page'));
  const limit = clamp(rawLimit ?? defaultLimit, 1, maxLimit);
  const page = clamp(rawPage ?? 0, 0, MAX_PAGE);
  return { limit, offset: page * limit };
}
