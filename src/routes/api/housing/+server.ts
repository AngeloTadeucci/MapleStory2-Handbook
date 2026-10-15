import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import type { HousingSearchItem } from '$lib/types/Item';
import { isHousingCategory, parseHousingFilterNumber } from '$lib/helpers/housing';
import { Prisma } from '$lib/generated/prisma/client';
import { parsePagination } from '$lib/server/pagination';

const prisma = DBClient.getInstance().prisma;

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const { limit, offset } = parsePagination(url.searchParams, 20);
  const category = parseHousingFilterNumber(url.searchParams.get('category'));
  const currency = parseHousingFilterNumber(url.searchParams.get('currency'));
  const buyable = url.searchParams.get('buyable') === 'true';

  const filters: Prisma.Sql[] = [
    Prisma.sql`i.housing_category > 0`,
    Prisma.sql`(i.housing_category <> 10000 OR fs.item_id IS NOT NULL)`
  ];

  if (search) {
    const searchPattern = `%${search}%`;
    filters.push(Prisma.sql`(i.name LIKE ${searchPattern} OR i.id LIKE ${searchPattern})`);
  }

  if (category != null && isHousingCategory(category)) {
    filters.push(Prisma.sql`i.housing_category = ${category}`);
  } else if (category != null) {
    filters.push(Prisma.sql`1 = 0`);
  }

  if (currency != null) {
    filters.push(Prisma.sql`fs.token_type = ${currency}`);
  }

  if (buyable) {
    filters.push(Prisma.sql`fs.buyable = 1`);
  }

  const where = Prisma.join(filters, ' AND ');

  const items = await prisma.$queryRaw<HousingSearchItem[]>`
    SELECT
      i.id,
      i.name,
      i.rarity,
      i.icon_path,
      i.main_description,
      i.guide_description,
      i.tooltip_description,
      i.is_outfit,
      i.housing_category,
      i.housing_trophy_id,
      i.housing_trophy_level,
      fs.buyable,
      fs.token_type,
      fs.price
    FROM items i
    LEFT JOIN furnishing_shop fs ON fs.item_id = i.id
    WHERE ${where}
    ORDER BY i.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const itemCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM items i
    LEFT JOIN furnishing_shop fs ON fs.item_id = i.id
    WHERE ${where}
  `;

  return json({ items, total: Number(itemCount[0].count) });
}) satisfies RequestHandler;
