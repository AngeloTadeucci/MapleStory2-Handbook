# Plan 10: Clothing simulator completion

## Accepted implementation checkpoint, 2026-09-06

The catalog, equipment/customization workflows and local release-02 candidate
are implemented. Both bodies have recorded visual checks. The user accepted
Gelo's saved-appearance preview for now despite remaining shader differences
and authorized source commits and plan updates. Shader parity and the explicitly
omitted Gelo items remain follow-up work. Generated assets remain local and
ignored. Publishing requires separate authorization. Read backend STATUS.md
for exact evidence; earlier requirements below describe scope, not undone phases.


Updated 2026-09-06.

The canonical, detailed implementation plan is
[SIMULATOR-PLAN.md in the backend](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/SIMULATOR-PLAN.md).
The backend owns the detailed cross-repository acceptance evidence. These
frontend summaries are tracked even though the plans directory has an ignore rule.

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
