# Frog Goals — Implementation Plans Overview

Plans for the code-deliverable milestones from the Young Frog Appreciation Meter.

| # | Milestone | Scope | Plan File |
|---|-----------|-------|-----------|
| 1 | Frog Logo (10k) | Small, frontend only | [01-frog-logo.md](01-frog-logo.md) |
| 2 | Soundtrack Player (50k) | Implemented | [02-soundtrack-player.md](02-soundtrack-player.md) |
| 3 | Housing Blocks (100k) | Implemented | [03-housing-blocks.md](03-housing-blocks.md) |
| 4 | Map Details (250k) | Medium, mostly frontend | [04-map-details.md](04-map-details.md) |
| 5 | Drop Tables (500k) | Implemented | [05-drop-tables.md](05-drop-tables.md) |
| 6 | Roll Simulator (750k) | High, frontend + backend | [06-roll-simulator.md](06-roll-simulator.md) |
| 7 | NPC Dialogs (1M) | High, frontend + backend | [07-npc-dialogs.md](07-npc-dialogs.md) |

## Suggested Implementation Order
1. **Plan 1** (Frog logo) — Quick win, frontend only
2. **Plan 3** (Housing) — Medium, establishes backend→frontend pipeline pattern
3. **Plan 5** (Drop tables) — High but high-value, enables bidirectional item/NPC browsing
4. **Plan 4** (Map details) — Medium, mostly frontend enhancements on existing data
5. **Plan 6** (Roll simulator) — High, complex backend + interactive frontend
6. **Plan 2** (Soundtrack) — Medium, depends on audio extraction pipeline
7. **Plan 7** (NPC dialogs) — Highest frontend complexity, save for last

## Cross-Cutting Concerns

### Shared `items` table modifications
Plans 3 (Housing) and 6 (Roll Simulator) both add columns to `items.sql`. Combine into a single schema update:
- Housing: `housing_category`, `housing_trophy_id`, `housing_trophy_level`
- Roll Sim: `option_constant_id`, `option_static_id`, `option_random_id`, `option_pick_id`, `option_level_factor`
- Modify `ItemParser.cs` once to insert all 8 new fields

### Program.cs parse order
```csharp
(["items"], ItemParser.Parse),                                                  // existing (now with 8 new columns)
(["item_boxes"], ItemDropParser.Parse),                                          // existing
(["item_option_constants", ...], ItemOptionTableParser.Parse),                   // NEW (Plan 6)
(["furnishing_shop"], FurnishingShopParser.Parse),                               // NEW (Plan 3)
(["drop_box_items"], ServerDropParser.Parse),                                    // NEW (Plan 5)
(["npcs", "npc_drop_boxes"], NpcParsing),                                        // modified (Plan 5)
(["maps", "map_npcs", "map_portals", "map_mobs"], MapParsing),                   // existing
(["achieves"], AchieveParser.Parse),                                             // existing
(["additional_effects"], AdditionalEffectParser.Parse),                          // existing
(["quests", "quest_maps"], QuestParser.Parse),                                   // existing
(["npc_scripts"], NpcScriptParser.Parse),                                        // NEW (Plan 7)
```

### Prisma workflow
After any backend parser run: `pnpm db:pull` in the frontend project to sync schema.

### Verification Strategy
For each plan:
1. **Backend:** Run GameParser, verify new tables populated with `SELECT COUNT(*) FROM table`
2. **Frontend:** `pnpm db:pull` → `pnpm check` → dev server visual verification
3. **Integration:** Navigate to affected detail pages, verify data renders correctly
