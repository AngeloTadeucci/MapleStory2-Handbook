import { error } from '@sveltejs/kit';

// Database ids are signed 32 bit integers. A larger number would make Prisma
// reject the query instead of finding nothing, which surfaces as a 500.
const MAX_ID = 2_147_483_647;

/** Parses a numeric route slug into a database id, or responds 404. */
export function parseIdSlug(slug: string | undefined): number {
  if (slug === undefined || !/^\d+$/.test(slug)) error(404, 'Not found');
  const id = Number(slug);
  if (!Number.isSafeInteger(id) || id > MAX_ID) error(404, 'Not found');
  return id;
}

/** Responds 404 when a looked up record does not exist. */
export function assertFound<T>(record: T | null | undefined): T {
  if (record === null || record === undefined) error(404, 'Not found');
  return record;
}

/** Unique database ids from a list that may hold anything, ready for an `in` filter. */
export function toDbIds(values: unknown[]): number[] {
  const ids = values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_ID
  );
  return [...new Set(ids)];
}
