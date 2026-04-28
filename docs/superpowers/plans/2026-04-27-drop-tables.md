# Item Drop Tables Implementation Plan

**Status:** Implemented.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Plan 5 item drop tables end to end. Backend ingests `individualItemDrop_Final.xml` from `Server.m2d` and per-NPC drop box references from `Xml.m2d` into two new tables; frontend renders bidirectional "Dropped By" / "Drops" sections on item and NPC detail pages.

**Architecture:** Backend GameParser gains a `ServerReader` for `Server.m2d`, a new `ServerDropParser` that flattens drop boxes/groups/items into `drop_box_items`, and an extension to `NpcParser` that inserts each NPC's `dropiteminfo.individualDropBoxId` and `individualHitDropBoxId` arrays into `npc_drop_boxes` keyed by `drop_type` (0 = death, 1 = hit). The frontend pulls Prisma types, joins the two tables on detail pages, and renders shared display helpers/components for drop type labels and drop-count formatting.

**Tech Stack:** C#/.NET 9 GameParser, MySQL/MariaDB, SqlKata, Prisma 7, SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind CSS 4, Vitest.

---

## File Map

Backend repository: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`

- Modify: `Maple2Storage/Types/Paths.cs` — add `ServerReader` for `Server.m2d`.
- Create: `GameParser/SQL/npc_drop_boxes.sql` — link table NPC ↔ drop box.
- Create: `GameParser/SQL/drop_box_items.sql` — flattened drop box → group → item entries.
- Create: `GameParser/Parsers/ServerDropParser.cs` — populates `drop_box_items` from Server.m2d.
- Modify: `GameParser/Parsers/NpcParser.cs` — insert `npc_drop_boxes` rows alongside `npcs`.
- Modify: `GameParser/Program.cs` — register `drop_box_items` parser, group `npcs` + `npc_drop_boxes`.

Frontend repository: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`

- Create: `src/lib/helpers/drops.ts` — drop type label and drop-count formatting helpers.
- Create: `tests/drops.test.ts` — Vitest coverage for helper behavior.
- Modify: `src/lib/types/Item.ts` — add `DroppedByEntry` type.
- Modify: `src/lib/types/Npc.ts` — add `NpcDropEntry` type.
- Create: `src/lib/components/item/ItemDroppedBy.svelte` — list of NPCs that drop the item.
- Create: `src/lib/components/npc/NpcDrops.svelte` — grid of items that the NPC drops.
- Modify: `src/routes/items/[slug]/+page.server.ts` — query NPCs that drop the item.
- Modify: `src/routes/items/[slug]/+page.svelte` — render `<ItemDroppedBy>`.
- Modify: `src/routes/npcs/[slug]/+page.server.ts` — query items the NPC drops.
- Modify: `src/routes/npcs/[slug]/+page.svelte` — render `<NpcDrops>`.
- Update generated files with `pnpm db:pull` after backend parser/database changes.

---

### Task 1: Frontend Drop Helper Tests

**Files:**
- Create: `tests/drops.test.ts`
- Will create next task: `src/lib/helpers/drops.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/drops.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { formatDropCount, getDropTypeLabel } from '$lib/helpers/drops';

describe('drops helpers', () => {
  test('labels known drop types', () => {
    expect(getDropTypeLabel(0)).toBe('On Death');
    expect(getDropTypeLabel(1)).toBe('On Hit');
  });

  test('falls back to numeric label for unknown drop types', () => {
    expect(getDropTypeLabel(7)).toBe('Type 7');
  });

  test('formats single drop count', () => {
    expect(formatDropCount(1, 1)).toBe('1');
    expect(formatDropCount(5, 5)).toBe('5');
  });

  test('formats drop count range', () => {
    expect(formatDropCount(1, 3)).toBe('1 ~ 3');
    expect(formatDropCount(10, 25)).toBe('10 ~ 25');
  });

  test('treats max < min as a single value', () => {
    expect(formatDropCount(5, 0)).toBe('5');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm test:unit tests/drops.test.ts --run
```

Expected: FAIL because `$lib/helpers/drops` does not exist.

---

### Task 2: Frontend Drop Helpers

**Files:**
- Create: `src/lib/helpers/drops.ts`
- Test: `tests/drops.test.ts`

- [ ] **Step 1: Implement helpers**

Create `src/lib/helpers/drops.ts`:

```ts
export const DROP_TYPES = [
  { value: 0, label: 'On Death' },
  { value: 1, label: 'On Hit' }
] as const;

const dropTypeLabels = new Map<number, string>(
  DROP_TYPES.map((entry) => [entry.value, entry.label])
);

export function getDropTypeLabel(dropType: number): string {
  return dropTypeLabels.get(dropType) ?? `Type ${dropType}`;
}

export function formatDropCount(min: number, max: number): string {
  if (max <= min) {
    return `${min}`;
  }
  return `${min} ~ ${max}`;
}
```

- [ ] **Step 2: Run helper tests**

Run:

```powershell
pnpm test:unit tests/drops.test.ts --run
```

Expected: PASS.

- [ ] **Step 3: Commit helper tests and implementation**

Run:

```powershell
git add -- tests/drops.test.ts src/lib/helpers/drops.ts
git commit -m "Add drop display helpers"
```

---

### Task 3: Backend Server Reader Path

**Files:**
- Modify: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\Maple2Storage\Types\Paths.cs`

- [ ] **Step 1: Confirm `Server.m2d` is present**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
Test-Path Maple2Storage\Resources\Server.m2d
Test-Path Maple2Storage\Resources\Server.m2h
```

Expected: both `True`. If either is `False`, stop and obtain the file (e.g. https://github.com/Zintixx/MapleStory2-XML/releases/latest) before continuing.

- [ ] **Step 2: Add `ServerReader` to Paths.cs**

Open `Maple2Storage/Types/Paths.cs` and add the `ServerReader` line after `ExportedReader`:

```csharp
using Maple2.File.IO;

namespace Maple2Storage.Types;

public static class Paths {
    public static readonly string SolutionDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));

    public static readonly string ScriptsDir = new(Path.Combine(SolutionDir, "Maple2Storage", "Scripts"));
    public static readonly M2dReader XmlReader = new(Path.Combine(SolutionDir, "Maple2Storage", "Resources", "Xml.m2d"));
    public static readonly M2dReader ExportedReader = new(Path.Combine(SolutionDir, "Maple2Storage", "Resources", "Exported.m2d"));
    public static readonly M2dReader ServerReader = new(Path.Combine(SolutionDir, "Maple2Storage", "Resources", "Server.m2d"));
    public static readonly string ItemWebFinderXml = Path.Combine(SolutionDir, "Maple2Storage", "itemWebfinder.xml");
}
```

- [ ] **Step 3: Verify project still builds**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
dotnet build Maple2Storage\Maple2Storage.csproj
```

Expected: build succeeds with 0 errors.

---

### Task 4: Backend Drop SQL Schema

**Files:**
- Create: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\SQL\npc_drop_boxes.sql`
- Create: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\SQL\drop_box_items.sql`

- [ ] **Step 1: Create `npc_drop_boxes.sql`**

Create `GameParser/SQL/npc_drop_boxes.sql`:

```sql
DROP TABLE IF EXISTS {databaseName}.npc_drop_boxes;

CREATE TABLE {databaseName}.npc_drop_boxes
(
    npc_id      int     not null,
    drop_box_id int     not null,
    drop_type   tinyint not null default 0,
    INDEX idx_npc_drop_boxes_npc_id (npc_id),
    INDEX idx_npc_drop_boxes_drop_box_id (drop_box_id),
    INDEX idx_npc_drop_boxes_npc_drop_type (npc_id, drop_type)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
```

- [ ] **Step 2: Create `drop_box_items.sql`**

Create `GameParser/SQL/drop_box_items.sql`:

```sql
DROP TABLE IF EXISTS {databaseName}.drop_box_items;

CREATE TABLE {databaseName}.drop_box_items
(
    drop_box_id     int     not null,
    group_id        int     not null,
    item_id         int     not null,
    item_id2        int     not null default 0,
    min_count       int     not null default 1,
    max_count       int     not null default 1,
    weight          int     not null default 0,
    rarity          tinyint not null default 1,
    smart_drop_rate int     not null default 0,
    enchant_level   int     not null default 0,
    INDEX idx_drop_box_items_drop_box_id (drop_box_id),
    INDEX idx_drop_box_items_item_id (item_id),
    INDEX idx_drop_box_items_item_id2 (item_id2)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
```

- [ ] **Step 3: Verify SQL files are present**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
Test-Path GameParser\SQL\npc_drop_boxes.sql
Test-Path GameParser\SQL\drop_box_items.sql
```

Expected: both `True`.

---

### Task 5: Backend Server Drop Parser

**Files:**
- Create: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Parsers\ServerDropParser.cs`

Reference the canonical use of `ServerTableParser.ParseIndividualItemDrop()` in `D:\Projetos\MapleStory2\Maple2\Maple2.File.Ingest\Mapper\ServerTableMapper.cs` (search for `ParseIndividualItemDropTable`).

- [ ] **Step 1: Create the parser**

Create `GameParser/Parsers/ServerDropParser.cs`:

```csharp
using Maple2.File.Parser;
using Maple2.File.Parser.Xml.Table.Server;
using Maple2Storage.Types;
using SqlKata.Execution;

namespace GameParser.Parsers;

public static class ServerDropParser {
    public static void Parse() {
        ServerTableParser parser = new(Paths.ServerReader);

        var dropBoxes = parser.ParseIndividualItemDrop().ToList();
        int total = dropBoxes.Sum(box => box.IndividualItemDrop.group.Sum(g => g.v.Count));
        int current = 0;

        Console.WriteLine($"Parsing {total} drop entries from {dropBoxes.Count} drop boxes...");

        foreach ((int boxId, IndividualItemDrop dropBox) in dropBoxes) {
            foreach (IndividualItemDrop.Group group in dropBox.group) {
                foreach (IndividualItemDrop.Group.Item item in group.v) {
                    current++;
                    if (current % 5000 == 0 || current == total) {
                        Console.WriteLine($"Parsing drops: {current}/{total}");
                    }

                    int minCount = item.minCount <= 0 ? 1 : item.minCount;
                    int maxCount = item.maxCount < minCount ? minCount : item.maxCount;
                    short rarity = item.grade.Length > 0 ? item.grade[0] : item.uiItemRank;
                    if (rarity <= 0) {
                        rarity = 1;
                    }

                    QueryManager.QueryFactory.Query("drop_box_items").Insert(new {
                        drop_box_id = boxId,
                        group_id = group.dropGroupID,
                        item_id = item.itemID,
                        item_id2 = item.itemID2,
                        min_count = minCount,
                        max_count = maxCount,
                        weight = item.weight,
                        rarity = (int) rarity,
                        smart_drop_rate = group.smartDropRate,
                        enchant_level = item.enchantLevel,
                    });
                }
            }
        }
    }
}
```

- [ ] **Step 2: Verify project still builds**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
dotnet build GameParser\GameParser.csproj
```

Expected: build succeeds with 0 errors.

---

### Task 6: Backend NPC Drop Box Insertion + Program Registration

**Files:**
- Modify: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Parsers\NpcParser.cs`
- Modify: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Program.cs`

- [ ] **Step 1: Insert per-NPC drop box rows**

In `GameParser/Parsers/NpcParser.cs`, after the existing `QueryManager.QueryFactory.Query("npcs").Insert(new { ... });` block (inside the same `foreach` loop, before the closing brace of the loop), append:

```csharp
            foreach (int boxId in data.dropiteminfo.individualDropBoxId.Distinct()) {
                if (boxId == 0) {
                    continue;
                }

                QueryManager.QueryFactory.Query("npc_drop_boxes").Insert(new {
                    npc_id = id,
                    drop_box_id = boxId,
                    drop_type = 0,
                });
            }

            foreach (int boxId in data.dropiteminfo.individualHitDropBoxId.Distinct()) {
                if (boxId == 0) {
                    continue;
                }

                QueryManager.QueryFactory.Query("npc_drop_boxes").Insert(new {
                    npc_id = id,
                    drop_box_id = boxId,
                    drop_type = 1,
                });
            }
```

`System.Linq` is already in scope via the existing `npcs` `.ToList()` call, so `Distinct()` resolves without an extra `using`.

- [ ] **Step 2: Register the new parsers in `Program.cs`**

In `GameParser/Program.cs`, locate the `tableGroups` array and replace the housing/item portion to insert `drop_box_items` after `furnishing_shop` and group `npcs` with `npc_drop_boxes`:

```csharp
(string[] tables, Action parser)[] tableGroups = [
    (["items"], ItemParser.Parse),
    (["furnishing_shop"], FurnishingShopParser.Parse),
    (["item_boxes"], ItemDropParser.Parse),
    (["drop_box_items"], ServerDropParser.Parse),
    (["npcs", "npc_drop_boxes"], NpcParser.Parse),
    (["maps", "map_npcs", "map_portals", "map_mobs"], () => {
        MapNameParser.Parse();
        MapSpawnParser.Parse();  // Parse spawn metadata (requires NpcParser to run first for tag lookup)
        MapEntityParser.Parse();
    }),
    (["achieves"], AchieveParser.Parse),
    (["additional_effects"], AdditionalEffectParser.Parse),
    (["quests", "quest_maps"], QuestParser.Parse),
    (["bgm_tracks"], BgmParser.Parse),
];
```

- [ ] **Step 3: Build backend**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
dotnet build GameParser\GameParser.csproj
```

Expected: build succeeds with 0 errors.

- [ ] **Step 4: Commit backend parser changes**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
git add -- Maple2Storage\Types\Paths.cs GameParser\SQL\npc_drop_boxes.sql GameParser\SQL\drop_box_items.sql GameParser\Parsers\ServerDropParser.cs GameParser\Parsers\NpcParser.cs GameParser\Program.cs
git commit -m "Add NPC drop box and server drop parsers"
```

---

### Task 7: Database Refresh and Prisma Sync

**Files:**
- Modify generated: `prisma/schema.prisma`
- Modify generated: `src/lib/generated/prisma/**`

- [ ] **Step 1: Run GameParser for affected tables**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`:

```powershell
dotnet run --project GameParser\GameParser.csproj
```

Expected prompts include:

```text
Drop and create drop_box_items? (y/n)
Drop and create npcs (+ npc_drop_boxes)? (y/n)
```

Answer `y` for both. Answer `n` for any other tables you do not need to refresh.

- [ ] **Step 2: Verify database rows**

Run against the local database using the configured MySQL client:

```sql
SELECT COUNT(*) AS drop_box_items_rows FROM drop_box_items;
SELECT COUNT(*) AS npc_drop_boxes_rows FROM npc_drop_boxes;
SELECT drop_type, COUNT(*) FROM npc_drop_boxes GROUP BY drop_type;
SELECT COUNT(DISTINCT npc_id) AS npcs_with_drops FROM npc_drop_boxes;
```

Expected: `drop_box_items_rows` and `npc_drop_boxes_rows` are greater than 0; `drop_type` query shows entries for both `0` and `1`.

- [ ] **Step 3: Pull Prisma schema in frontend**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
pnpm db:pull
```

Expected: `prisma/schema.prisma` includes `model drop_box_items` and `model npc_drop_boxes`, both with the columns defined in Task 4.

- [ ] **Step 4: Commit Prisma sync**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
git add -- prisma\schema.prisma
git commit -m "Sync drop tables Prisma schema"
```

Note: `src/lib/generated/prisma/**` is ignored by git in this repo (see `.gitignore`), so it does not need to be staged.

---

### Task 8: Frontend Types

**Files:**
- Modify: `src/lib/types/Item.ts`
- Modify: `src/lib/types/Npc.ts`

- [ ] **Step 1: Add `DroppedByEntry` to `Item.ts`**

In `src/lib/types/Item.ts`, append after the `HousingSearchItem` interface:

```ts
export interface DroppedByEntry {
  id: number;
  name: string;
  portrait: string;
  is_boss: number;
  level: number;
  drop_type: number;
}
```

- [ ] **Step 2: Add `NpcDropEntry` to `Npc.ts`**

In `src/lib/types/Npc.ts`, append after the `SearchNpc` type:

```ts
export interface NpcDropEntry {
  id: number;
  name: string;
  icon_path: string;
  rarity: number;
  is_outfit: number;
  drop_type: number;
  min_count: number;
  max_count: number;
}
```

- [ ] **Step 3: Run type check**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 4: Commit type additions**

Run:

```powershell
git add -- src\lib\types\Item.ts src\lib\types\Npc.ts
git commit -m "Add drop entry types"
```

---

### Task 9: Item Detail "Dropped By" Section

**Files:**
- Modify: `src/routes/items/[slug]/+page.server.ts`
- Modify: `src/routes/items/[slug]/+page.svelte`
- Create: `src/lib/components/item/ItemDroppedBy.svelte`

- [ ] **Step 1: Query NPCs that drop the item**

In `src/routes/items/[slug]/+page.server.ts`, add a `DroppedByEntry` import next to the existing `Item` import:

```ts
import type Item from '$lib/types/Item';
import type { DroppedByEntry } from '$lib/types/Item';
```

After the `furnishingShop` block (just before the `result` assignment), add:

```ts
  const droppedByRaw = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    portrait: string;
    is_boss: number;
    level: number;
    drop_type: number | bigint;
  }>>`
    SELECT n.id, n.name, n.portrait, n.is_boss, n.level,
           MIN(ndb.drop_type) AS drop_type
    FROM drop_box_items dbi
    JOIN npc_drop_boxes ndb ON ndb.drop_box_id = dbi.drop_box_id
    JOIN npcs n ON n.id = ndb.npc_id
    WHERE dbi.item_id = ${item.id} OR dbi.item_id2 = ${item.id}
    GROUP BY n.id, n.name, n.portrait, n.is_boss, n.level
    ORDER BY n.is_boss DESC, n.level ASC, n.name ASC
    LIMIT 200
  `;

  const droppedBy: DroppedByEntry[] = droppedByRaw.map((row) => ({
    id: row.id,
    name: row.name,
    portrait: row.portrait,
    is_boss: row.is_boss,
    level: row.level,
    drop_type: Number(row.drop_type),
  }));
```

Add `droppedBy` to the returned `props` object:

```ts
  return {
    props: {
      item: result,
      boxContent,
      additionalEffectDescriptions,
      furnishingShop,
      droppedBy
    }
  };
```

- [ ] **Step 2: Create `ItemDroppedBy.svelte`**

Create `src/lib/components/item/ItemDroppedBy.svelte`:

```svelte
<script lang="ts">
  import type { DroppedByEntry } from '$lib/types/Item';
  import NpcImage from '$lib/components/npc/NpcImage.svelte';
  import { getDropTypeLabel } from '$lib/helpers/drops';
  import ItemListContainer from './ItemListContainer.svelte';

  interface Props {
    droppedBy: DroppedByEntry[];
  }

  let { droppedBy }: Props = $props();
</script>

<ItemListContainer gap={3}>
  <p class="font-semibold text-green">Dropped By</p>
  <div class="flex flex-col gap-2">
    {#each droppedBy as npc (npc.id + '-' + npc.drop_type)}
      <a
        href={`/npcs/${npc.id}`}
        data-sveltekit-reload
        class="unstyled flex items-center gap-3 rounded p-2 transition-colors hover:bg-surface-600"
      >
        <NpcImage name={npc.name} portrait={npc.portrait} />
        <div class="flex min-w-0 flex-1 flex-col">
          <p class="truncate font-semibold">
            {npc.name}
            {#if npc.is_boss === 1}
              <span class="ml-2 rounded bg-red-700 px-1 py-0.5 text-xs uppercase">Boss</span>
            {/if}
          </p>
          <p class="text-xs text-surface-400">
            Lv. {npc.level} · {getDropTypeLabel(npc.drop_type)}
          </p>
        </div>
      </a>
    {/each}
  </div>
</ItemListContainer>
```

- [ ] **Step 3: Render `ItemDroppedBy` on the item page**

In `src/routes/items/[slug]/+page.svelte`, add the import next to the other component imports:

```ts
  import ItemDroppedBy from '$lib/components/item/ItemDroppedBy.svelte';
```

Add the `droppedBy` derived value next to the existing derived values (after the `descriptions` line):

```ts
  const droppedBy = $derived(data.props.droppedBy as DroppedByEntry[]);
```

Add the corresponding type import next to the existing `AdditionalEffectDescription` import:

```ts
  import type { AdditionalEffectDescription, DroppedByEntry } from '$lib/types/Item';
```

In the page markup, add the rendering block after the existing `{#if boxContent.length > 0}` block, still inside the `<div class="flex flex-col flex-wrap ...">` container:

```svelte
      {#if droppedBy.length > 0}
        <ItemDroppedBy {droppedBy} />
      {/if}
```

- [ ] **Step 4: Run type check**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 5: Commit item-detail integration**

Run:

```powershell
git add -- src\routes\items\[slug]\+page.server.ts src\routes\items\[slug]\+page.svelte src\lib\components\item\ItemDroppedBy.svelte
git commit -m "Show dropped-by NPCs on item pages"
```

---

### Task 10: NPC Detail "Drops" Section

**Files:**
- Modify: `src/routes/npcs/[slug]/+page.server.ts`
- Modify: `src/routes/npcs/[slug]/+page.svelte`
- Create: `src/lib/components/npc/NpcDrops.svelte`

- [ ] **Step 1: Query items the NPC drops**

In `src/routes/npcs/[slug]/+page.server.ts`, add the type import:

```ts
import type { NpcDropEntry } from '$lib/types/Npc';
```

After the `npcMaps` query (and before the `return`), add:

```ts
  const npcDropsRaw = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    icon_path: string;
    rarity: number;
    is_outfit: number;
    drop_type: number | bigint;
    min_count: number | bigint;
    max_count: number | bigint;
  }>>`
    SELECT i.id, i.name, i.icon_path, i.rarity, i.is_outfit,
           MIN(ndb.drop_type) AS drop_type,
           MIN(dbi.min_count) AS min_count,
           MAX(dbi.max_count) AS max_count
    FROM npc_drop_boxes ndb
    JOIN drop_box_items dbi ON dbi.drop_box_id = ndb.drop_box_id
    JOIN items i ON i.id = dbi.item_id
    WHERE ndb.npc_id = ${npc.id} AND dbi.item_id > 0
    GROUP BY i.id, i.name, i.icon_path, i.rarity, i.is_outfit
    ORDER BY i.rarity DESC, i.name ASC
    LIMIT 500
  `;

  const npcDrops: NpcDropEntry[] = npcDropsRaw.map((row) => ({
    id: row.id,
    name: row.name,
    icon_path: row.icon_path,
    rarity: row.rarity,
    is_outfit: row.is_outfit,
    drop_type: Number(row.drop_type),
    min_count: Number(row.min_count),
    max_count: Number(row.max_count),
  }));
```

Update the returned props:

```ts
  return {
    props: {
      npc,
      npcMaps,
      npcDrops
    }
  };
```

- [ ] **Step 2: Create `NpcDrops.svelte`**

Create `src/lib/components/npc/NpcDrops.svelte`:

```svelte
<script lang="ts">
  import type { NpcDropEntry } from '$lib/types/Npc';
  import ItemImage from '$lib/components/item/ItemImage.svelte';
  import ItemListContainer from '$lib/components/item/ItemListContainer.svelte';
  import { formatDropCount, getDropTypeLabel } from '$lib/helpers/drops';

  interface Props {
    drops: NpcDropEntry[];
  }

  let { drops }: Props = $props();

  const groupedDrops = $derived.by(() => {
    const buckets = new Map<number, NpcDropEntry[]>();
    for (const drop of drops) {
      const list = buckets.get(drop.drop_type) ?? [];
      list.push(drop);
      buckets.set(drop.drop_type, list);
    }
    return Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  });
</script>

<ItemListContainer gap={3}>
  <p class="font-semibold text-green">Drops</p>
  <div class="flex flex-col gap-4">
    {#each groupedDrops as [type, entries] (type)}
      <div class="flex flex-col gap-2">
        <p class="text-sm uppercase text-surface-300">{getDropTypeLabel(type)}</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {#each entries as drop (drop.id)}
            <a
              href={`/items/${drop.id}`}
              data-sveltekit-reload
              class="unstyled flex flex-col items-center gap-1 rounded p-2 transition-colors hover:bg-surface-600"
            >
              <ItemImage
                iconPath={drop.icon_path}
                rarity={drop.rarity}
                name={drop.name}
                minCount={drop.min_count}
                maxCount={drop.max_count}
                isOutfit={drop.is_outfit === 1}
              />
              <p class="line-clamp-2 text-center text-xs">{drop.name}</p>
              <p class="text-[10px] text-surface-400">{formatDropCount(drop.min_count, drop.max_count)}</p>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</ItemListContainer>
```

- [ ] **Step 3: Render `NpcDrops` on the NPC page**

In `src/routes/npcs/[slug]/+page.svelte`, add the imports near the other component imports:

```ts
  import NpcDrops from '$lib/components/npc/NpcDrops.svelte';
  import type { NpcDropEntry } from '$lib/types/Npc';
```

Add the derived value next to the existing ones:

```ts
  const npcDrops = $derived(data.props.npcDrops as NpcDropEntry[]);
```

In the markup, add the drops block inside the `<div class="flex flex-col flex-wrap ...">` container, after `<NpcDetails>`:

```svelte
      {#if npcDrops.length > 0}
        <NpcDrops drops={npcDrops} />
      {/if}
```

- [ ] **Step 4: Run type check**

Run:

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 5: Commit NPC-detail integration**

Run:

```powershell
git add -- src\routes\npcs\[slug]\+page.server.ts src\routes\npcs\[slug]\+page.svelte src\lib\components\npc\NpcDrops.svelte
git commit -m "Show drops on NPC pages"
```

---

### Task 11: Final Verification and Plan Status

**Files:**
- Modify: `plans/05-drop-tables.md`
- Modify: `plans/00-overview.md`
- Modify: `docs/superpowers/plans/2026-04-27-drop-tables.md`

- [ ] **Step 1: Run frontend verification**

Run from `D:\Projetos\Maple2_Codex\MapleStory2-Handbook`:

```powershell
pnpm test:unit tests/drops.test.ts --run
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

- An item known to drop from a boss (e.g. a quest or trophy reward item) shows a "Dropped By" section listing that boss with the correct drop-type label.
- A common drop item shows multiple NPCs in "Dropped By".
- A boss NPC's detail page shows a "Drops" section grouped by drop type, with item icons, rarity borders, names, and `min ~ max` counts.
- A non-aggressive NPC with no drops shows no "Drops" section.
- Clicking an NPC card on the item page navigates to `/npcs/{id}`.
- Clicking an item card on the NPC page navigates to `/items/{id}`.

- [ ] **Step 4: Mark Plan 5 implemented**

In `plans/05-drop-tables.md`, add after the title line:

```md
**Status:** Implemented.
```

In `plans/00-overview.md`, change the Plan 5 row scope from:

```md
High, frontend + backend
```

to:

```md
Implemented
```

In this plan file (`docs/superpowers/plans/2026-04-27-drop-tables.md`), add after the title:

```md
**Status:** Implemented.
```

- [ ] **Step 5: Commit final status docs**

`plans/` is ignored by Git in this repository, so use `-f` for the two files there:

```powershell
git add -- docs\superpowers\plans\2026-04-27-drop-tables.md
git add -f -- plans\05-drop-tables.md plans\00-overview.md
git commit -m "Mark drop tables plan implemented"
```
