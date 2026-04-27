# Housing Blocks Catalog Design

## Goal

Build the Plan 3 housing blocks catalog end to end: persist housing metadata in the backend database, expose a searchable `/housing` catalog in the frontend, and show housing details on item pages.

## Scope

This includes backend parser/schema work in `MapleStory2-Handbook-BackEnd` and frontend work in this SvelteKit project. It does not include new raw game data extraction beyond existing item and furnishing shop sources.

## Backend Design

The `items` table will gain three housing fields:

- `housing_category SMALLINT NOT NULL DEFAULT 0`
- `housing_trophy_id INT NOT NULL DEFAULT 0`
- `housing_trophy_level INT NOT NULL DEFAULT 0`

`ItemParser.cs` already reads `data.housing`; it will insert the housing category and trophy requirement values into those new columns.

Shop data will live in a separate `furnishing_shop` table:

- `item_id INT NOT NULL`
- `buyable TINYINT NOT NULL DEFAULT 0`
- `token_type TINYINT NOT NULL DEFAULT 0`
- `price INT NOT NULL DEFAULT 0`

`FurnishingShopParser.cs` will parse existing furnishing shop metadata and insert one row per item. `Program.cs` will register the table after `items` so item records exist before frontend joins are queried.

## Frontend Design

The frontend will add a `/housing` route backed by `/api/housing`. The API accepts:

- `search`
- `category`
- `currency`
- `buyable`
- `limit`
- `page`

The catalog will follow the existing item list conventions: search input, category/currency filters, pagination through `PaginationWrapper`, item icon cards, and links to `/items/{id}`.

Shared housing display helpers will map numeric category and token values into readable labels. `HousingBadge.svelte` will show category and shop price consistently in both the housing catalog and item detail page.

## Item Detail Integration

`src/routes/items/[slug]/+page.server.ts` will fetch the matching `furnishing_shop` row when the item has housing metadata. The item detail page will render a housing information section with category, price/currency, buyable state, and trophy requirement when present.

## Data Flow

1. Backend parser reads item housing fields and furnishing shop metadata.
2. GameParser populates `items` and `furnishing_shop`.
3. Frontend runs `pnpm db:pull` to refresh Prisma models.
4. `/api/housing` joins `items` to `furnishing_shop`.
5. `/housing` and item detail pages render the joined data.

## Error Handling

The catalog API will treat invalid filter values as no-match or ignored filters rather than throwing. Item detail pages will render housing sections only when housing data exists. Missing shop rows will still show category/trophy metadata, because some housing items may not be buyable from the furnishing shop.

## Testing

Testing will focus on stable, low-level behavior where this codebase supports it:

- Unit tests for housing category and token formatting helpers.
- API query parameter validation through focused helper tests if query construction is extracted.
- Frontend `pnpm check` after Prisma schema regeneration.
- Backend compile/parser verification after schema and parser changes.

Manual verification will cover `/housing`, category and currency filters, pagination, and a housing item detail page.
