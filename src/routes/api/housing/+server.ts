import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import type { HousingSearchItem } from '$lib/types/Item';
import { isHousingCategory, parseHousingFilterNumber } from '$lib/helpers/housing';

const prisma = DBClient.getInstance().prisma;

export const GET = (async ({ url }) => {
  const search = url.searchParams.get('search') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 200);
  const page = Number(url.searchParams.get('page') ?? 0);
  const offset = Math.max(page, 0) * limit;
  const category = parseHousingFilterNumber(url.searchParams.get('category'));
  const currency = parseHousingFilterNumber(url.searchParams.get('currency'));
  const buyable = url.searchParams.get('buyable') === 'true';

  if (search.includes('"')) {
    return json({ items: [], total: 0 });
  }

  const filters: string[] = ['i.housing_category > 0', '(i.housing_category <> 10000 OR fs.item_id IS NOT NULL)'];
  const searchString = `"%${search}%"`;

  if (search) {
    filters.push(`(i.name LIKE ${searchString} OR i.id LIKE ${searchString})`);
  }

  if (category != null && isHousingCategory(category)) {
    filters.push(`i.housing_category = ${category}`);
  } else if (category != null) {
    filters.push('1 = 0');
  }

  if (currency != null) {
    filters.push(`fs.token_type = ${currency}`);
  }

  if (buyable) {
    filters.push('fs.buyable = 1');
  }

  const where = filters.join(' AND ');

  const itemsStatement = `
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
    FROM maple2_codex.items i
    LEFT JOIN maple2_codex.furnishing_shop fs ON fs.item_id = i.id
    WHERE ${where}
    ORDER BY i.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countStatement = `
    SELECT COUNT(*) as count
    FROM maple2_codex.items i
    LEFT JOIN maple2_codex.furnishing_shop fs ON fs.item_id = i.id
    WHERE ${where}
  `;

  const items = await prisma.$queryRawUnsafe<HousingSearchItem[]>(itemsStatement);
  const itemCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countStatement);

  return json({ items, total: Number(itemCount[0].count) });
}) satisfies RequestHandler;
