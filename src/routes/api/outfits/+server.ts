import { json, type RequestHandler } from '@sveltejs/kit';
import DBClient from '$lib/prismaClient';
import {
  catalogSchema,
  characterPreviewBase,
  libraryBase,
  searchSchema,
  slotNumbers
} from '$lib/outfits/catalog';
import type { Prisma } from '$lib/generated/prisma/client';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const parsed = searchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return json({ message: 'Invalid outfit search filters' }, { status: 400 });
  const query = parsed.data;
  try {
    const base = query.preview ? characterPreviewBase(query.preview) : libraryBase;
    const response = await fetch(`${base}simulator-catalog.json`);
    if (!response.ok) throw new Error('Model catalog is unavailable');
    const catalog = catalogSchema.parse(await response.json());
    const entries = catalog.items.filter((item) => item.bodyVariant === query.body);
    const eligible = entries.filter(
      (item) =>
        (query.availability === 'all' ||
          (query.availability === 'verified'
            ? item.availability === 'verified'
            : item.availability !== 'unavailable')) &&
        (!query.slot ||
          (query.slot === 'full'
            ? item.slots.includes('CL') && item.slots.includes('PA')
            : item.slots.includes(query.slot)))
    );
    const restrictIds = query.availability !== 'all' || query.slot === 'full';
    const where: Prisma.itemsWhereInput = {
      name: { not: '' },
      ...(restrictIds
        ? { id: { in: eligible.map((item) => item.itemId) } }
        : {
            AND: [
              {
                OR: [
                  {
                    slot: {
                      in: query.slot ? [slotNumbers[query.slot]] : Object.values(slotNumbers)
                    }
                  },
                  ...(!query.slot || query.slot === 'HR'
                    ? [{ id: { gte: 10200000, lt: 10300000 } }]
                    : []),
                  ...(!query.slot || query.slot === 'FA'
                    ? [{ id: { gte: 10300000, lt: 10400000 } }]
                    : [])
                ]
              }
            ]
          }),
      gender: { in: [query.body === 'male' ? 0 : 1, 2] },
      ...(query.outfit !== 'all' ? { is_outfit: query.outfit === 'true' ? 1 : 0 } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              ...(/^\d+$/.test(query.search) && Number.isSafeInteger(Number(query.search))
                ? [{ id: Number(query.search) }]
                : [])
            ]
          }
        : {})
    };
    const prisma = DBClient.getInstance().prisma;
    const [items, total] = await Promise.all([
      prisma.items.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: query.page * query.limit,
        take: query.limit,
        select: {
          id: true,
          name: true,
          icon_path: true,
          gender: true,
          slot: true,
          is_outfit: true,
          dyeable: true,
          kfms: true
        }
      }),
      prisma.items.count({ where })
    ]);
    return json({
      items: items.map((item) => ({
        ...item,
        library: entries.find((entry) => entry.itemId === item.id) ?? null
      })),
      total,
      page: query.page,
      limit: query.limit
    });
  } catch (cause) {
    console.error(
      'Outfit catalog query failed',
      cause instanceof Error ? cause.message : 'Unknown error'
    );
    return json(
      { message: 'Unable to load the clothing catalog. Please try again.' },
      { status: 503 }
    );
  }
};
