# Plan 10: Clothing simulator completion

Updated 2026-09-06.

The canonical, detailed implementation plan is
[SIMULATOR-PLAN.md in the backend](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/SIMULATOR-PLAN.md).
It lives there because this frontend plans directory is ignored by Git.

Implement in this order:

1. Catalog and supported clothing library.
2. Equipment rules and compatibility.
3. Hair, faces and customization.
4. Backgrounds, poses and visual acceptance.
5. Publish the supported library and simulator.

Each phase in the canonical plan names implementation areas and exit checks.
Individual missing clothes, poses and effects are acceptable. Both bodies and
core clothing workflows must work. Effects and particle simulation are excluded.
Full NPC/map conversion and a global Noesis default switch are separate work.

[Plan 08](08-outfit-simulator.md) summarizes the simulator foundation.
[Plan 09](09-nif-to-gltf-converter.md) retains the wider converter backlog.
