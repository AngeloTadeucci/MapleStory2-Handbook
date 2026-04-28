# Plan 5: Item Drop Tables (500k) — Frontend + Backend

**Status:** Implemented.

**Scope:** High. New data source (`server.m2d`), new parser, new tables, bidirectional display.

## Data Flow
```
server.m2d → individualItemDrop_Final.xml → drop_box_items table
Xml.m2d → NpcData.dropiteminfo.individualDropBoxId → npc_drop_boxes table
Frontend: item page shows "Dropped By NPCs" / NPC page shows "Drops Items"
```

## Backend

**Add server.m2d reader** — modify `Maple2Storage/Types/Paths.cs`:
```csharp
public static readonly M2dReader ServerReader = new(Path.Combine(SolutionDir, "Maple2Storage/Resources/Server.m2d"));
```
Note: `Server.m2d` file needs to be placed in `Maple2Storage/Resources/`.

**New table:** `npc_drop_boxes` — `GameParser/SQL/npc_drop_boxes.sql`:
```
npc_id INT, drop_box_id INT, drop_type TINYINT (0=death, 1=hit)
UNIQUE(npc_id, drop_box_id, drop_type), INDEX on npc_id, INDEX on drop_box_id
```

**New table:** `drop_box_items` — `GameParser/SQL/drop_box_items.sql`:
```
drop_box_id INT, group_id INT, item_id INT, item_id2 INT DEFAULT 0,
min_count INT DEFAULT 1, max_count INT DEFAULT 1, weight INT DEFAULT 0,
rarity TINYINT DEFAULT 1, smart_drop_rate INT DEFAULT 0, enchant_level INT DEFAULT 0
INDEX on drop_box_id, INDEX on item_id
```

**Modify `GameParser/Parsers/NpcParser.cs`** — after NPC insert, extract drop box IDs:
```csharp
foreach (int boxId in data.dropiteminfo.individualDropBoxId) {
    if (boxId == 0) continue;
    QueryManager.QueryFactory.Query("npc_drop_boxes").Insert(new { npc_id = id, drop_box_id = boxId, drop_type = 0 });
}
// Same for individualHitDropBoxId with drop_type = 1
```

**New parser:** `GameParser/Parsers/ServerDropParser.cs`
- Use `ServerTableParser` from Maple2.File.Parser with `Paths.ServerReader`
- Call `ParseIndividualItemDrop()`, iterate dropBoxID → groups → items
- Insert into `drop_box_items`
- Reference: `D:\Projetos\MapleStory2\Maple2\Maple2.File.Ingest\Mapper\ServerTableMapper.cs` lines 634-716

**Register in `Program.cs`:**
```csharp
(["drop_box_items"], ServerDropParser.Parse),
(["npcs", "npc_drop_boxes"], NpcParsing),  // expanded from just ["npcs"]
```

## Frontend

### Item detail — "Dropped By" section
- Modify `src/routes/items/[slug]/+page.server.ts` — JOIN query: `drop_box_items → npc_drop_boxes → npcs` WHERE `item_id = X`
- New component: `src/lib/components/item/ItemDroppedBy.svelte` — list of NPC cards with portrait, name, level, boss badge
- Add to item detail page after ItemBoxContent

### NPC detail — "Drops" section
- Modify `src/routes/npcs/[slug]/+page.server.ts` — JOIN query: `npc_drop_boxes → drop_box_items → items` WHERE `npc_id = X`
- New component: `src/lib/components/npc/NpcDrops.svelte` — grid of item icons with name, rarity border, drop count
- Add to NPC detail page

## Files
- **Backend new:** `GameParser/SQL/npc_drop_boxes.sql`, `GameParser/SQL/drop_box_items.sql`, `GameParser/Parsers/ServerDropParser.cs`
- **Backend modify:** `Maple2Storage/Types/Paths.cs`, `GameParser/Parsers/NpcParser.cs`, `GameParser/Program.cs`
- **Frontend new:** `src/lib/components/item/ItemDroppedBy.svelte`, `src/lib/components/npc/NpcDrops.svelte`
- **Frontend modify:** `src/routes/items/[slug]/+page.server.ts`, `src/routes/items/[slug]/+page.svelte`, `src/routes/npcs/[slug]/+page.server.ts`, `src/routes/npcs/[slug]/+page.svelte`
