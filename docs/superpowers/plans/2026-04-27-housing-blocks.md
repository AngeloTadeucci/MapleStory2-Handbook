# Housing Blocks Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Plan 3 housing blocks catalog end to end, including backend persistence, a searchable `/housing` frontend catalog, and housing details on item pages.

**Architecture:** Backend GameParser persists housing item metadata into `items` and furnishing shop metadata into a normalized `furnishing_shop` table. The frontend refreshes Prisma types, exposes `/api/housing`, and shares display helpers/components between the catalog page and item detail page.

**Tech Stack:** C#/.NET 9 GameParser, MySQL/MariaDB, Prisma 7, SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind CSS 4, Vitest.

---

## File Map

Backend repository: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`

- Modify: `GameParser/SQL/items.sql` - add housing columns to item rows.
- Create: `GameParser/SQL/furnishing_shop.sql` - table for housing shop metadata.
- Modify: `GameParser/Parsers/ItemParser.cs` - insert housing fields from `data.housing`.
- Create: `GameParser/Parsers/FurnishingShopParser.cs` - populate `furnishing_shop`.
- Modify: `GameParser/Program.cs` - register `furnishing_shop` parser after `items`.

Frontend repository: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`

- Create: `src/lib/helpers/housing.ts` - housing category/token labels and API filter parsing helpers.
- Create: `tests/housing.test.ts` - Vitest coverage for helper behavior.
- Modify: `src/lib/types/Item.ts` - add housing fields and shop row types.
- Create: `src/lib/components/item/HousingBadge.svelte` - shared housing category and price display.
- Create: `src/routes/api/housing/+server.ts` - paginated housing search API.
- Create: `src/routes/housing/+page.svelte` - housing catalog UI.
- Modify: `src/routes/items/[slug]/+page.server.ts` - fetch item furnishing shop data.
- Modify: `src/routes/items/[slug]/+page.svelte` - pass furnishing shop data into details.
- Modify: `src/lib/components/item/ItemDetails.svelte` - render housing details.
- Modify: `src/lib/components/Navigation.svelte` - add Housing nav entry.
- Update generated files with `pnpm db:pull` after backend parser/database changes.

---

### Task 1: Frontend Housing Helper Tests

**Files:**
- Create: `tests/housing.test.ts`
- Create: `src/lib/helpers/housing.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/housing.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  getHousingCategoryLabel,
  getHousingTokenLabel,
  isHousingCategory,
  parseHousingFilterNumber
} from '$lib/helpers/housing';

describe('housing helpers', () => {
  test('formats known housing categories', () => {
    expect(getHousingCategoryLabel(1)).toBe('Bed');
    expect(getHousingCategoryLabel(3)).toBe('Sofas & Chairs');
    expect(getHousingCategoryLabel(10000)).toBe('Misc');
  });

  test('formats unknown housing categories with the numeric id', () => {
    expect(getHousingCategoryLabel(777)).toBe('Category 777');
  });

  test('detects valid category filters', () => {
    expect(isHousingCategory(1)).toBe(true);
    expect(isHousingCategory(204)).toBe(true);
    expect(isHousingCategory(777)).toBe(false);
  });

  test('formats furnishing token labels', () => {
    expect(getHousingTokenLabel(0)).toBe('Meso');
    expect(getHousingTokenLabel(1)).toBe('Meret');
    expect(getHousingTokenLabel(9)).toBe('Token 9');
  });

  test('parses integer filters safely', () => {
    expect(parseHousingFilterNumber('91')).toBe(91);
    expect(parseHousingFilterNumber('')).toBeNull();
    expect(parseHousingFilterNumber(null)).toBeNull();
    expect(parseHousingFilterNumber('1 OR 1=1')).toBeNull();
    expect(parseHousingFilterNumber('1.5')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm test:unit tests/housing.test.ts
```

Expected: FAIL because `$lib/helpers/housing` does not exist.

---

### Task 2: Frontend Housing Helpers

**Files:**
- Create: `src/lib/helpers/housing.ts`
- Test: `tests/housing.test.ts`

- [ ] **Step 1: Implement minimal helpers**

Create `src/lib/helpers/housing.ts`:

```ts
export const HOUSING_CATEGORIES = [
  { value: 1, label: 'Bed' },
  { value: 2, label: 'Table' },
  { value: 3, label: 'Sofas & Chairs' },
  { value: 4, label: 'Storage' },
  { value: 5, label: 'Wall Decoration' },
  { value: 6, label: 'Wall Tiles' },
  { value: 7, label: 'Bathroom' },
  { value: 8, label: 'Lighting' },
  { value: 9, label: 'Electronics' },
  { value: 10, label: 'Fences' },
  { value: 11, label: 'Natural Terrain' },
  { value: 12, label: 'Garden' },
  { value: 13, label: 'Special Blocks' },
  { value: 14, label: 'Stairs' },
  { value: 15, label: 'Doors' },
  { value: 16, label: 'Common Terrain' },
  { value: 17, label: 'Vegetation' },
  { value: 18, label: 'Interior Decor' },
  { value: 19, label: 'Themed Decor' },
  { value: 20, label: 'Structures' },
  { value: 21, label: 'Traps' },
  { value: 91, label: 'Maid' },
  { value: 92, label: 'Souvenirs' },
  { value: 93, label: 'UGC Block' },
  { value: 94, label: 'Event' },
  { value: 95, label: 'UGC Bed' },
  { value: 96, label: 'UGC Table' },
  { value: 97, label: 'UGC Stairs' },
  { value: 204, label: 'Ranching' },
  { value: 205, label: 'Farming' },
  { value: 10000, label: 'Misc' }
] as const;

export const HOUSING_TOKENS = [
  { value: 0, label: 'Meso' },
  { value: 1, label: 'Meret' }
] as const;

const categoryLabels = new Map<number, string>(HOUSING_CATEGORIES.map((category) => [category.value, category.label]));
const tokenLabels = new Map<number, string>(HOUSING_TOKENS.map((token) => [token.value, token.label]));

export function getHousingCategoryLabel(category: number): string {
  return categoryLabels.get(category) ?? `Category ${category}`;
}

export function isHousingCategory(category: number): boolean {
  return categoryLabels.has(category);
}

export function getHousingTokenLabel(tokenType: number): string {
  return tokenLabels.get(tokenType) ?? `Token ${tokenType}`;
}

export function parseHousingFilterNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}
```

- [ ] **Step 2: Run helper tests**

Run:

```powershell
pnpm test:unit tests/housing.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit helper tests and implementation**

Run:

```powershell
git add -- tests/housing.test.ts src/lib/helpers/housing.ts
git commit -m "Add housing display helpers"
```

---

### Task 3: Backend Housing Schema

**Files:**
- Modify: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\SQL\items.sql`
- Create: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\SQL\furnishing_shop.sql`

- [ ] **Step 1: Update `items.sql`**

In `GameParser/SQL/items.sql`, add these columns after `story_book_id` and before the primary key constraint:

```sql
    housing_category     smallint         not null default 0,
    housing_trophy_id    int              not null default 0,
    housing_trophy_level int              not null default 0,
```

The end of the table definition should read:

```sql
    represent_option    int              not null default 0,
    additional_effects  text             not null,
    story_book_id       int              not null default 0,
    housing_category     smallint         not null default 0,
    housing_trophy_id    int              not null default 0,
    housing_trophy_level int              not null default 0,
    CONSTRAINT items_pk PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
```

- [ ] **Step 2: Create `furnishing_shop.sql`**

Create `GameParser/SQL/furnishing_shop.sql`:

```sql
DROP TABLE IF EXISTS {databaseName}.furnishing_shop;

CREATE TABLE {databaseName}.furnishing_shop
(
    item_id    int     not null,
    buyable    tinyint not null default 0,
    token_type tinyint not null default 0,
    price      int     not null default 0,
    CONSTRAINT furnishing_shop_pk PRIMARY KEY (item_id),
    INDEX idx_furnishing_shop_token_type (token_type),
    INDEX idx_furnishing_shop_buyable (buyable)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
```

- [ ] **Step 3: Verify backend SQL files are present**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
Test-Path GameParser\SQL\furnishing_shop.sql
Select-String -Path GameParser\SQL\items.sql -Pattern "housing_category"
```

Expected: `True`, then one matching `housing_category` line.

---

### Task 4: Backend Parsers

**Files:**
- Modify: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Parsers\ItemParser.cs`
- Create: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Parsers\FurnishingShopParser.cs`
- Modify: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Program.cs`

- [ ] **Step 1: Insert item housing fields**

In `ItemParser.cs`, inside the anonymous object passed to `QueryManager.QueryFactory.Query("items").Insert(new { ... })`, add these fields after `story_book_id = storyBookId,`:

```csharp
                housing_category = housing?.categoryIndex ?? 0,
                housing_trophy_id = housing?.trophyID ?? 0,
                housing_trophy_level = housing?.trophyLevel ?? 0,
```

- [ ] **Step 2: Create furnishing shop parser**

Create `GameParser/Parsers/FurnishingShopParser.cs`:

```csharp
using Maple2.File.Parser;
using Maple2.File.Parser.Tools;
using Maple2Storage.Types;
using SqlKata.Execution;

namespace GameParser.Parsers;

public static class FurnishingShopParser {
    public static void Parse() {
        Filter.Load(Paths.XmlReader, "NA", "Live");
        TableParser parser = new(Paths.XmlReader, "en");

        var entries = parser.ParseFurnishingShopUgcAll()
            .Concat(parser.ParseFurnishingShopMaid())
            .GroupBy(entry => entry.Item1)
            .Select(group => group.First())
            .ToList();

        Console.WriteLine($"Parsing {entries.Count} furnishing shop entries...");

        int current = 0;
        foreach (var entry in entries) {
            current++;
            if (current % 100 == 0 || current == entries.Count) {
                Console.WriteLine($"Parsing furnishing shop: {current}/{entries.Count}");
            }

            QueryManager.QueryFactory.Query("furnishing_shop").Insert(new {
                item_id = entry.Item1,
                buyable = entry.Item2.ugcHousingBuy,
                token_type = (int) entry.Item2.ugcHousingMoneyType,
                price = entry.Item2.ugcHousingDefaultPrice,
            });
        }
    }
}
```

- [ ] **Step 3: Register parser in `Program.cs`**

In `GameParser/Program.cs`, add `furnishing_shop` after `items`:

```csharp
    (["items"], ItemParser.Parse),
    (["furnishing_shop"], FurnishingShopParser.Parse),
    (["item_boxes"], ItemDropParser.Parse),
```

- [ ] **Step 4: Build backend parser**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
dotnet build GameParser\GameParser.csproj
```

Expected: build succeeds with 0 errors.

- [ ] **Step 5: Commit backend parser changes**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
git add -- GameParser\SQL\items.sql GameParser\SQL\furnishing_shop.sql GameParser\Parsers\ItemParser.cs GameParser\Parsers\FurnishingShopParser.cs GameParser\Program.cs
git commit -m "Add housing furnishing parser"
```

---

### Task 5: Database Refresh and Prisma Sync

**Files:**
- Modify generated: `prisma/schema.prisma`
- Modify generated: `src/lib/generated/prisma/**`

- [ ] **Step 1: Run GameParser for affected tables**

Run the GameParser from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd` and recreate `items` and `furnishing_shop` when prompted:

```powershell
dotnet run --project GameParser\GameParser.csproj
```

Expected prompts:

```text
Drop and create items? (y/n)
Drop and create furnishing_shop? (y/n)
```

Answer `y` for `items` and `furnishing_shop`. Answer `n` for the other table prompts.

- [ ] **Step 2: Verify database rows**

Run against the local database using the configured MySQL client:

```sql
SELECT COUNT(*) AS housing_items FROM items WHERE housing_category > 0;
SELECT COUNT(*) AS furnishing_shop_rows FROM furnishing_shop;
```

Expected: both counts are greater than 0.

- [ ] **Step 3: Pull Prisma schema in frontend**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
pnpm db:pull
```

Expected: `prisma/schema.prisma` includes `housing_category`, `housing_trophy_id`, `housing_trophy_level`, and `model furnishing_shop`.

- [ ] **Step 4: Commit Prisma sync**

Run:

```powershell
git add -- prisma\schema.prisma src\lib\generated\prisma
git commit -m "Sync housing Prisma schema"
```

---

### Task 6: Frontend Types and Housing Badge

**Files:**
- Modify: `src/lib/types/Item.ts`
- Create: `src/lib/components/item/HousingBadge.svelte`
- Test: `tests/housing.test.ts`

- [ ] **Step 1: Extend item types**

In `src/lib/types/Item.ts`, add fields to the default `Item` interface after `additional_effects`:

```ts
  story_book_id: number;
  housing_category: number;
  housing_trophy_id: number;
  housing_trophy_level: number;
  furnishing_shop?: FurnishingShop | null;
```

Add these interfaces near the bottom of the file:

```ts
export interface FurnishingShop {
  item_id: number;
  buyable: number;
  token_type: number;
  price: number;
}

export interface HousingSearchItem extends SearchItem {
  housing_category: number;
  housing_trophy_id: number;
  housing_trophy_level: number;
  buyable: number | null;
  token_type: number | null;
  price: number | null;
}
```

- [ ] **Step 2: Create `HousingBadge.svelte`**

Create `src/lib/components/item/HousingBadge.svelte`:

```svelte
<script lang="ts">
  import { Home, Coins, Gem, Lock } from 'lucide-svelte';
  import { getHousingCategoryLabel, getHousingTokenLabel } from '$lib/helpers/housing';

  interface Props {
    category: number;
    tokenType?: number | null;
    price?: number | null;
    buyable?: number | null;
    compact?: boolean;
  }

  let { category, tokenType = null, price = null, buyable = null, compact = false }: Props = $props();

  const categoryLabel = $derived(getHousingCategoryLabel(category));
  const tokenLabel = $derived(tokenType == null ? null : getHousingTokenLabel(tokenType));
  const showPrice = $derived(price != null && price > 0 && tokenType != null);
</script>

<div class="flex flex-wrap items-center gap-2 text-sm">
  <span class="inline-flex items-center gap-1 rounded bg-surface-600 px-2 py-1 text-surface-100">
    <Home size={compact ? 14 : 16} />
    {categoryLabel}
  </span>

  {#if showPrice}
    <span class="inline-flex items-center gap-1 rounded bg-surface-600 px-2 py-1 text-surface-100">
      {#if tokenType === 1}
        <Gem size={compact ? 14 : 16} />
      {:else}
        <Coins size={compact ? 14 : 16} />
      {/if}
      {price?.toLocaleString()} {tokenLabel}
    </span>
  {/if}

  {#if buyable === 0}
    <span class="inline-flex items-center gap-1 rounded bg-surface-600 px-2 py-1 text-surface-300">
      <Lock size={compact ? 14 : 16} />
      Not Buyable
    </span>
  {/if}
</div>
```

- [ ] **Step 3: Run helper tests**

Run:

```powershell
pnpm test:unit tests/housing.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit types and badge**

Run:

```powershell
git add -- src\lib\types\Item.ts src\lib\components\item\HousingBadge.svelte
git commit -m "Add housing item display types"
```

---

### Task 7: Housing API

**Files:**
- Create: `src/routes/api/housing/+server.ts`
- Uses: `src/lib/helpers/housing.ts`

- [ ] **Step 1: Create `/api/housing` endpoint**

Create `src/routes/api/housing/+server.ts`:

```ts
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

  const filters: string[] = ['i.housing_category > 0'];
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
```

- [ ] **Step 2: Run type check for API**

Run:

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 3: Commit housing API**

Run:

```powershell
git add -- src\routes\api\housing\+server.ts
git commit -m "Add housing catalog API"
```

---

### Task 8: Housing Catalog Page

**Files:**
- Create: `src/routes/housing/+page.svelte`
- Modify: `src/lib/components/Navigation.svelte`

- [ ] **Step 1: Create `/housing` page**

Create `src/routes/housing/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import debounce from 'lodash.debounce';
  import { onMount } from 'svelte';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import HousingBadge from '$lib/components/item/HousingBadge.svelte';
  import PaginationWrapper from '$lib/components/PaginationWrapper.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import paramsBuilder from '$lib/helpers/paramsBuilder';
  import { HOUSING_CATEGORIES, HOUSING_TOKENS } from '$lib/helpers/housing';
  import type { HousingSearchItem } from '$lib/types/Item';

  let searchTerm = $state('');
  let selectedCategory = $state('');
  let selectedCurrency = $state('');
  let buyableOnly = $state(false);
  let data: HousingSearchItem[][] = $state([]);
  let loading = $state(true);
  let currentPage = $state(1);
  let pageSize = $state(25);
  let totalItems = $state(0);
  const pageSizeOptions = [25, 50, 100, 200];

  function buildParams() {
    return paramsBuilder([
      { name: 'search', value: searchTerm },
      { name: 'category', value: selectedCategory },
      { name: 'currency', value: selectedCurrency },
      { name: 'buyable', value: buyableOnly ? 'true' : null },
      { name: 'page', value: currentPage - 1 },
      { name: 'limit', value: pageSize }
    ]);
  }

  async function fetchData(clearCache: boolean) {
    const dataIndex = currentPage - 1;
    if (data[dataIndex] && !clearCache) {
      return;
    }

    loading = true;
    const response = await fetch(`/api/housing${buildParams()}`);
    const responseJson = await response.json();
    const items = responseJson.items as HousingSearchItem[];
    const total = responseJson.total as number;

    if (clearCache) {
      data = [];
    }

    const newData = [...data];
    newData[dataIndex] = items;
    data = newData;
    totalItems = total;
    loading = false;
  }

  const paginatedSource = $derived(data[currentPage - 1] || []);

  function syncUrl() {
    const params = buildParams();
    goto(`/housing${params}`, { keepFocus: true, replaceState: true });
  }

  function resetAndFetch() {
    currentPage = 1;
    syncUrl();
    fetchData(true);
  }

  const debouncedSearch = debounce(resetAndFetch, 400, { maxWait: 1000 });

  function onPageChange(newPage: number) {
    currentPage = newPage;
    syncUrl();
    fetchData(false);
  }

  function onPageSizeChange(newSize: number) {
    pageSize = newSize;
    resetAndFetch();
  }

  onMount(() => {
    searchTerm = $page.url.searchParams.get('search') || '';
    selectedCategory = $page.url.searchParams.get('category') || '';
    selectedCurrency = $page.url.searchParams.get('currency') || '';
    buyableOnly = $page.url.searchParams.get('buyable') === 'true';
    currentPage = $page.url.searchParams.get('page') ? Number($page.url.searchParams.get('page')) + 1 : 1;
    pageSize = $page.url.searchParams.get('limit') ? Number($page.url.searchParams.get('limit')) : 25;
    fetchData(false);
  });
</script>

<svelte:head>
  <title>MS2 Handbook - Housing</title>
</svelte:head>

<div class="mt-8 h-px"></div>
<div class="main-container mx-4 rounded-xl px-5 pb-10 pt-2 lg:m-auto lg:w-3/4">
  <h1 class="mb-4 text-4xl font-bold">Housing</h1>

  <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
    <input
      type="text"
      placeholder="Search"
      class="input w-full bg-surface-700 px-4 py-2 text-surface-50 placeholder:text-surface-400 lg:w-1/3"
      bind:value={searchTerm}
      oninput={debouncedSearch}
    />

    <select
      bind:value={selectedCategory}
      onchange={resetAndFetch}
      class="input bg-surface-700 px-3 py-2 text-surface-50"
    >
      <option value="">All Categories</option>
      {#each HOUSING_CATEGORIES as category}
        <option value={category.value}>{category.label}</option>
      {/each}
    </select>

    <select
      bind:value={selectedCurrency}
      onchange={resetAndFetch}
      class="input bg-surface-700 px-3 py-2 text-surface-50"
    >
      <option value="">All Currencies</option>
      {#each HOUSING_TOKENS as token}
        <option value={token.value}>{token.label}</option>
      {/each}
    </select>

    <label class="flex items-center gap-2 text-sm text-surface-200">
      <input type="checkbox" bind:checked={buyableOnly} onchange={resetAndFetch} />
      Buyable
    </label>
  </div>

  <div class="mt-6 flex items-center justify-between gap-3">
    <p class="text-sm text-surface-400">{totalItems} item{totalItems === 1 ? '' : 's'}</p>
    <PaginationWrapper
      count={totalItems}
      {pageSize}
      page={currentPage}
      {pageSizeOptions}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
  {:else if paginatedSource.length === 0}
    <div class="flex items-center justify-center py-12">
      <h2>No housing items found</h2>
    </div>
  {:else}
    <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#each paginatedSource as item (item.id)}
        <a href={`/items/${item.id}`} class="unstyled rounded bg-surface-700 p-3 transition-colors hover:bg-surface-600">
          <div class="flex gap-3">
            <ItemImage
              iconPath={item.icon_path}
              rarity={item.rarity}
              name={item.name}
              isOutfit={item.is_outfit === 1}
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{item.name}</p>
              <p class="text-xs text-surface-400">#{item.id}</p>
              <div class="mt-2">
                <HousingBadge
                  category={item.housing_category}
                  tokenType={item.token_type}
                  price={item.price}
                  buyable={item.buyable}
                  compact
                />
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Add Housing navigation link**

In `src/lib/components/Navigation.svelte`, add Housing after Items:

```ts
    { name: 'Items', path: '/items', extraClass: 'hidden md:flex' },
    { name: 'Housing', path: '/housing', extraClass: 'hidden md:flex' },
    { name: 'NPCs', path: '/npcs', extraClass: 'hidden md:flex' },
```

- [ ] **Step 3: Run type check**

Run:

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 4: Commit catalog UI**

Run:

```powershell
git add -- src\routes\housing\+page.svelte src\lib\components\Navigation.svelte
git commit -m "Add housing catalog page"
```

---

### Task 9: Item Detail Housing Section

**Files:**
- Modify: `src/routes/items/[slug]/+page.server.ts`
- Modify: `src/routes/items/[slug]/+page.svelte`
- Modify: `src/lib/components/item/ItemDetails.svelte`

- [ ] **Step 1: Fetch furnishing shop row**

In `src/routes/items/[slug]/+page.server.ts`, after `additionalEffectDescriptions` are built and before `return`, add:

```ts
  const furnishingShop = item.housing_category > 0
    ? await prisma.furnishing_shop.findUnique({
        where: {
          item_id: item.id
        }
      })
    : null;
```

Add `furnishingShop` to returned props:

```ts
      item,
      boxContent,
      additionalEffectDescriptions,
      furnishingShop
```

- [ ] **Step 2: Attach shop data to the page item**

In `src/routes/items/[slug]/+page.svelte`, replace the current item derived value:

```ts
  const item = $derived(data.props.item as unknown as Item);
```

with this derived value:

```ts
  const item = $derived.by(() => {
    const itemData = data.props.item as unknown as Item;
    return {
      ...itemData,
      furnishing_shop: data.props.furnishingShop ?? null
    } satisfies Item;
  });
```

- [ ] **Step 3: Render housing info in `ItemDetails.svelte`**

In `src/lib/components/item/ItemDetails.svelte`, add import:

```ts
  import HousingBadge from './HousingBadge.svelte';
```

In both desktop and mobile item detail bodies, after the item description block and before tradeability, add:

```svelte
      {#if item.housing_category > 0}
        <hr id="splitline1" />
        <div class="item-middle gap-2 pt-3">
          <p class="font-semibold text-green">Housing</p>
          <HousingBadge
            category={item.housing_category}
            tokenType={item.furnishing_shop?.token_type}
            price={item.furnishing_shop?.price}
            buyable={item.furnishing_shop?.buyable}
          />
          {#if item.housing_trophy_id > 0}
            <p class="text-sm text-surface-300">
              Trophy requirement: {item.housing_trophy_id}
              {#if item.housing_trophy_level > 0}
                Lv. {item.housing_trophy_level}
              {/if}
            </p>
          {/if}
        </div>
      {/if}
```

- [ ] **Step 4: Run type check**

Run:

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 5: Commit item detail integration**

Run:

```powershell
git add -- src\routes\items\[slug]\+page.server.ts src\routes\items\[slug]\+page.svelte src\lib\components\item\ItemDetails.svelte
git commit -m "Show housing details on item pages"
```

---

### Task 10: Final Verification and Plan Status

**Files:**
- Modify: `plans/03-housing-blocks.md`
- Modify: `plans/00-overview.md`

- [ ] **Step 1: Run frontend verification**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
pnpm test:unit tests/housing.test.ts
pnpm check
```

Expected: both commands pass.

- [ ] **Step 2: Run backend verification**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
dotnet build GameParser\GameParser.csproj
```

Expected: build succeeds with 0 errors.

- [ ] **Step 3: Manually verify UI**

Use the already-running frontend dev server and verify:

- `/housing` loads and displays housing items.
- Search by a known housing item name filters results.
- Category filter changes results.
- Currency filter changes results when shop data exists.
- Buyable checkbox only shows buyable shop entries.
- A housing catalog card links to `/items/{id}`.
- The item detail page shows the Housing section.

- [ ] **Step 4: Mark Plan 3 implemented**

In `plans/03-housing-blocks.md`, add after the title:

```md
**Status:** Implemented.
```

In `plans/00-overview.md`, change Plan 3 scope from:

```md
Medium, frontend + backend
```

to:

```md
Implemented
```

- [ ] **Step 5: Commit final status docs**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
git add -- plans\03-housing-blocks.md plans\00-overview.md
git commit -m "Mark housing plan implemented"
```

Note: `plans/` is ignored by Git in this repository. Use `git add -f -- plans\03-housing-blocks.md plans\00-overview.md` when committing these status changes.
