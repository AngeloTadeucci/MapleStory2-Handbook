import { Prisma } from '$lib/generated/prisma/client';

/** Parses a comma-separated query param into integers, dropping anything that is not one. */
export function parseIntList(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^-?\d+$/.test(part))
    .map(Number);
}

/**
 * `AND column IN (...)` for a list filter. A param that was given but held no
 * integers matches nothing, rather than silently widening the search.
 */
export function inListCondition(column: string, raw: string | null): Prisma.Sql {
  if (!raw) return Prisma.empty;
  const values = parseIntList(raw);
  if (values.length === 0) return Prisma.sql` AND 1 = 0`;
  return Prisma.sql` AND ${Prisma.raw(column)} IN (${Prisma.join(values)})`;
}
