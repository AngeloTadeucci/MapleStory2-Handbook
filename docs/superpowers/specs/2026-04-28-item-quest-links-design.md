# Item ↔ Quest Linking — Completing the Item / NPC / Quest Triangle

**Date:** 2026-04-28
**Status:** Approved design, ready for implementation plan

## Problem

The handbook already has bidirectional item ↔ NPC linking via the `drop_box_items` / `npc_drop_boxes` tables (item pages show "Dropped By", NPC pages show "Drops"). The quest side of the triangle is partially wired:

- Quest pages link out to start/complete NPCs and to maps.
- Quest pages render rewards (start/complete) from JSON columns on `quests`.
- **Items have no quest backlinks.** Item 30000368 (Clashing Cymbals) drops from Clanging Bunny but its item page has no indication of any quest involvement, even though quests reference items via the XML `<condition>` blocks.
- **NPCs have no quest backlinks** for the "kill these mobs" objective relationship.
- **Quest pages don't show objectives** (the "kill 5 X" / "collect 10 Y" data) — only rewards.

The root cause is that the existing quest parser only captures `basic`, `require`, `start`, `complete`, rewards, and maps. It ignores `<condition>` blocks entirely, and the rewards live in JSON columns that can't be reverse-indexed efficiently.

## Goals

1. Show "Required by quests" and "Rewarded by quests" sections on the item detail page.
2. Show "Required for quests" on the NPC detail page (kill-target objectives).
3. Show an "Objectives" section on the quest detail page covering all condition types.
4. Keep the existing JSON-based rewards rendering on the quest page intact (no regression).

## Non-Goals

- Parsing `progressMap` hints on conditions (UI step-grouping). The `target[]` array already carries the relevant map ids. Revisit if a real quest renders ambiguously.
- Surfacing every ConditionType uniquely. The 320+ types collapse into three display modes: item-typed, NPC-typed, and a generic "label: value" fallback.
- Renaming the existing `startRewards` / `completeRewards` JSON columns on `quests`. The new `quest_rewards` table is a parallel index, not a replacement.

## Architecture

Two new tables, populated by an extension to the existing `QuestParser`. Frontend reads them via `prisma.$queryRaw` (consistent with existing `@@ignore`/raw-table conventions in this codebase).

```
quests (existing)
  ├──┐ startRewards  / completeRewards   (JSON, kept as-is for forward render)
  │  │
  │  └──► quest_rewards (NEW)            (normalized index for reverse lookup)
  │         FK quest_id  → quests.id
  │         item_id (indexed)
  │
  └──► quest_objectives (NEW)            (polymorphic, one row per <condition>)
        FK quest_id  → quests.id
        condition_type (indexed)
        codes JSON   (item ids / npc ids / map ids — type-dependent)
```

### Data Model

#### `quest_rewards`

Normalized from the existing JSON columns. Forward-rendering on the quest page continues to use the JSON; this table exists purely so item pages can ask "which quests reward me?" with a single indexed JOIN instead of a `JSON_CONTAINS` table scan.

```
id           BIGINT PK AUTO
quest_id     INT     (FK → quests.id, indexed)
reward_kind  ENUM('start','complete')
item_id      INT     (indexed)
count        INT
rank         INT     (preserves XML ordering for any future UI)
```

#### `quest_objectives`

One row per `<condition>` element. Polymorphic — the meaning of `codes`/`targets` depends on `condition_type`. Filtering by allowlist happens at query time, not parse time.

```
id                BIGINT PK AUTO
quest_id          INT     (FK → quests.id, indexed)
sequence          INT     (order within the quest's condition list)
condition_type    VARCHAR(64)   (ConditionType enum name as string — future-proof against new types)
required_value    BIGINT  (the `value` attribute: count, time, score, etc.)
codes             JSON    (the `code[]` array — item ids, npc ids, map ids, etc.)
targets           JSON    (the `target[]` array)
party_count       INT     (nullable; only set when > 0 in XML)
guild_party_count INT     (nullable; only set when > 0 in XML)
```

**Reverse-lookup index strategy.** The hot reverse queries (`item → quests`, `npc → quests`) need to filter by the first element of `codes`. Two options, decided at migration time based on what MariaDB's version supports:

- **Preferred:** functional index `CREATE INDEX idx_obj_first_code ON quest_objectives ((CAST(codes->>'$[0]' AS UNSIGNED)));`
- **Fallback:** add a generated column `first_code INT GENERATED ALWAYS AS (CAST(codes->>'$[0]' AS UNSIGNED))` and index that.

Both let the reverse query stay one bounded JOIN.

### Backend Parser

Location: `D:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd\GameParser\Parsers\QuestParser.cs`

Changes are additive to the existing parse loop:

1. **Truncate** `quest_rewards` and `quest_objectives` at the start of the run, matching the existing parser's rebuild-from-scratch convention.
2. **For each `quest.acceptReward.item` and `quest.completeReward.item`** — insert one `quest_rewards` row per item with `reward_kind = 'start'` (for accept) or `'complete'`. Field names align with the existing JSON column names so the schema vocabulary stays consistent.
3. **For each `quest.condition`** (already deserialized as `List<Condition>` by `Maple2.File.Parser.Xml.Quest`) — insert one `quest_objectives` row. `condition_type` is the `ConditionType` enum name as a string. `codes` and `targets` are JSON-serialized string arrays.
4. **No allowlist logic in the parser.** Every condition becomes a row. The frontend filters by `condition_type` at query time, which means new ConditionTypes appearing in future patches do not require a parser change.

Inserts use the existing SqlKata `QueryFactory.Insert` pattern.

### Frontend

#### Shared helper

New file `src/lib/helpers/quests.ts`:

- `ITEM_OBJECTIVE_TYPES` — the allowlist of `condition_type` values that count as "this quest needs this item":
  - `item_pickup`, `item_collect`, `item_collect_revise`, `item_exist`, `item_inven`, `item_add`
- `NPC_OBJECTIVE_TYPES` — the allowlist for "this quest needs this NPC killed/interacted":
  - `npc`, `npc_lasthit`, `npc_lasthit_buff`, `npc_lasthit_time`, `npc_field_boss`, `npc_field_elite`, `npc_dungeon_boss`, `killcount`, `spawner`
- `getObjectiveLabel(type: string): string` — human-readable label for the generic fallback render.

Both allowlists are server-side constants. Tuning them does not require re-parsing.

#### Page server queries

Five new queries (all `prisma.$queryRaw`, all bounded by `LIMIT`):

1. **`src/routes/items/[slug]/+page.server.ts` — required by quests:**
   ```sql
   SELECT DISTINCT q.id, q.name, q.questType, q.requiredLevel
   FROM quest_objectives o
   JOIN quests q ON q.id = o.quest_id
   WHERE o.condition_type IN (...ITEM_OBJECTIVE_TYPES)
     AND JSON_CONTAINS(o.codes, JSON_QUOTE(?))
   ORDER BY q.requiredLevel ASC LIMIT 200
   ```
2. **`src/routes/items/[slug]/+page.server.ts` — rewarded by quests:**
   ```sql
   SELECT DISTINCT q.id, q.name, q.questType, q.requiredLevel, qr.reward_kind, qr.count
   FROM quest_rewards qr
   JOIN quests q ON q.id = qr.quest_id
   WHERE qr.item_id = ?
   ORDER BY q.requiredLevel ASC LIMIT 200
   ```
3. **`src/routes/npcs/[slug]/+page.server.ts` — required for quests:** same shape as (1) with `NPC_OBJECTIVE_TYPES`.
4. **`src/routes/quests/[slug]/+page.server.ts` — objectives:** `SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY sequence`, plus enrichment lookups for any code that resolves to an item (name + icon + rarity from `items`) or NPC (name + portrait from `npcs`).

(Five surfaces from Section 3 of brainstorming, but only four new server queries — the existing quest-page Rewards block remains unchanged.)

#### Components

All new components live under `src/lib/components/` and use `ItemListContainer` for the framed-box look (matches the recently-shipped `ItemDroppedBy` / `NpcDrops`):

- `item/ItemRequiredByQuests.svelte` — list of quest links (name, level, quest type label).
- `item/ItemRewardedByQuests.svelte` — list of quest links plus reward kind ("Start" / "Complete") and count.
- `npc/NpcRequiredForQuests.svelte` — same shape as `ItemRequiredByQuests`.
- `quest/QuestObjectives.svelte` — for each objective:
  - If `condition_type ∈ ITEM_OBJECTIVE_TYPES`: `<ItemImage>` + name + `× required_value`, linking to `/items/[code]`.
  - If `condition_type ∈ NPC_OBJECTIVE_TYPES`: `<NpcImage>` + name + `× required_value`, linking to `/npcs/[code]`.
  - Otherwise: plain `{getObjectiveLabel(type)}: {required_value}`.

#### Page wiring

Each new section is conditional on `length > 0` and slots into the existing left flex-column on its page, matching the pattern used by `ItemDroppedBy` and `NpcDrops`.

## Data Flow

```
Backend parser run
  ├─► TRUNCATE quest_rewards, quest_objectives
  ├─► for quest in quests.xml:
  │     ├─► insert quests row (existing)
  │     ├─► for reward in quest.acceptReward.item:    insert quest_rewards (kind='start')
  │     ├─► for reward in quest.completeReward.item:  insert quest_rewards (kind='complete')
  │     └─► for condition in quest.condition:         insert quest_objectives

Frontend request: /items/30000368
  ├─► existing item query
  ├─► droppedBy query (existing)
  ├─► requiredByQuests query  (NEW: quest_objectives JOIN, item allowlist)
  └─► rewardedByQuests query  (NEW: quest_rewards JOIN)

Frontend request: /npcs/21000174
  ├─► existing npc query
  ├─► npcDrops query (existing)
  └─► requiredForQuests query (NEW: quest_objectives JOIN, npc allowlist)

Frontend request: /quests/[id]
  ├─► existing quest query (rewards still rendered from JSON via Rewards.svelte)
  └─► objectives query     (NEW: quest_objectives by quest_id, enriched with item/npc names)
```

## Error Handling and Edge Cases

- **Empty conditions / empty rewards.** Sections render nothing when `length === 0` (same convention as existing `ItemDroppedBy`).
- **Unknown ConditionType strings.** Rendered via the generic `{label}: {value}` fallback; no crash, no special case.
- **`code[]` empty for non-target conditions** (e.g., `level`, `playtime`). The functional index on `codes->>'$[0]'` returns NULL, which is excluded from any `item_id`/`npc_id` filter naturally.
- **Item/NPC code points to a deleted entity.** Enrichment LEFT JOIN; rows with no match render as raw id text. Rare in practice but won't break the page.
- **Duplicate objectives across quests.** The `DISTINCT` on the reverse queries collapses them.
- **Existing `Rewards.svelte` on quest page.** Unchanged. The new `quest_rewards` table is purely an index for the reverse direction.

## Testing

- **Backend parser:** spot-check three quests with known shapes — one with item-collect objectives, one with NPC-kill objectives, one with mixed/exotic conditions (e.g., `stay_map`). Verify row counts in both new tables match the XML.
- **Frontend:**
  - `/items/30000368` should now show "Required by quests" with the relevant quest entry. (This is the user-visible smoke test that drove the whole feature.)
  - `/npcs/21000174` should show "Required for quests" if Clanging Bunny appears in any kill objective.
  - A quest page with mixed objective types should render items with images, NPCs with portraits, and other types with the plain-text fallback — no crash on unknown types.

## Open Decisions Resolved During Brainstorming

| Decision | Choice | Reason |
|---|---|---|
| Scope: rewards-only or full triangle | **Both** rewards and objectives | Example item (30000368) only makes sense with objectives; rewards are nearly free since data is already in JSON. |
| Data shape for objectives | **Single polymorphic table** with `condition_type` discriminator | 320+ ConditionTypes; splitting into per-type tables would explode the parser surface area for no reverse-lookup benefit. |
| Filter strategy | **Store everything; filter at query time** with TS allowlists | New ConditionTypes from future patches don't require parser changes. |
| Rewards storage | **Normalize into `quest_rewards`** (parallel to existing JSON) | `JSON_CONTAINS` reverse lookups can't use indexes; normalized table is one indexed JOIN. |
| UI surfaces | **All five** (item-required-by, item-rewarded-by, npc-required-for, quest-objectives, existing quest-rewards) | Skipping any one leaves the triangle asymmetric. |
| `progressMap` on conditions | **Skip for v1** | UI hint only; `target[]` carries the relevant map ids. |
