# Plan 08: Outfit simulator

Updated 2026-09-06. The native preview foundation exists; the remaining work is
product completion and supported clothing coverage across backend and frontend.

## Current implementation plan

Follow [Plan 10](10-outfit-simulator-completion.md), whose canonical roadmap is
[the backend simulator completion plan](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/SIMULATOR-PLAN.md).

The agreed priority is:

1. Searchable catalog and a useful supported clothing library.
2. Equipment slots, full-outfit conflicts, body cutting and compatibility.
3. Hair/face selection, hair/hat fitting, expressions and customization.
4. Backgrounds, poses and direct visual acceptance.
5. Reproducible asset publishing and release verification.

A usable simulator may omit individual clothes, poses and effects. Both body
variants and the core dressing workflows must work. Effects and particle
simulation are excluded. Unsupported items must not appear to work silently.
Complete conversion of every NPC/map asset is not a prerequisite.

## What exists

`/outfits` loads native bodies and equipment onto a shared skeleton. It supports
six curated body clips, orbit controls, playback, source-driven CL replacement,
shared skin colors, garment recoloring/reset and PNG capture. Acceptance-06
contains two bodies and eight equipment variants, plus one NPC and one map object.
These fixtures establish specific behaviors; they are not a finished catalog.

Recent fixes preserved the hoodie's exposed-skin mesh and synchronized its skin
palette with the body. The incompatible staged male shirt was replaced as an
acceptance sample, not repaired. Complete outfits and the broader library still
need compatibility checks. See [backend status](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/STATUS.md).

## Reference research

The original investigation is preserved in
[the archived Plan 08](research/08-outfit-simulator-before-completion-plan.md).
It contains earlier reference-site and bundle observations, not current acceptance
criteria. Claims that the frontend only needs bookkeeping or that no further
material work is needed are superseded by the completion plan.

Recent clothing fixes used client XML/NIF/HLSL, our local T3 preview and numerical
regressions. They were not verified through a fresh live reference-site comparison.
The completion plan calls for targeted reference checks of unresolved hair/hat,
full-outfit, expression and dye behavior, with exact item/body state recorded.
