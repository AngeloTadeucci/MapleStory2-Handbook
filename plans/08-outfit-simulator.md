# Plan 08: Outfit simulator

## Motion, library and shaders completed, 2026-09-06

The four authorized follow-ups are implemented. The default `simulator-release-04`
contains 144 models and 82 reviewed item/body entries, with 32 previews and 10
unavailable entries. Gelo's `/outfits?preview=gelo-05` keeps twelve saved instances
and dyes. The sign plays its source KF on private joints. Both bodies have star
combat idle/run, explicit draw/stow, additional clothing sets and robes, and the
recovered Thin Adventurer Cape. Knuckles use their source hand attachnodes.

Direct T3 checks also corrected the slot-0 full-outfit search filter and framing
of animated geometry. Shading uses source half-Lambert diffuse, gloss maps,
specular powers and enable flags. The face remains non-specular as authored.
Paired star back overlap, full scene/rim/hair shader parity and cape cloth physics
remain explicit limits. Effects and particles stay excluded.

Verification: 35 C# tests, 12 Python tests, 192 focused frontend tests and a clean
typecheck. All 144 glTFs validate without errors/warnings. All 620 release files
reproduce byte for byte. Exact item/state evidence and rebuilding instructions
are in backend STATUS.md and Diagnostics/refine_simulator.py. No follow-up commit,
publishing, production write or existing-process stop occurred. Older sections
below describe earlier checkpoints.


## Gelo equipment follow-up implemented, 2026-09-06

The user prioritized missing equipment/decorations before publishing. The local
`/outfits?preview=gelo-02` now includes neon sign 11820024 with private joints,
blush 10400108 using the client skin shader UV transform, and independent left
and right Fire Prism Stars 13400306 with saved dyes. The default release-03
library contains 142 models and 58 reviewed item/body entries. Release-02 stays
unchanged. The backend extension builder and review record preserve source and
appearance evidence. This follow-up is uncommitted and not deployed.

Both bodies were checked with drawn stars. Dance T intersects the face and is
marked in the viewer. Independent sign animation, weapon combat poses and shader
parity remain limited. Effects remain excluded. Read the latest backend STATUS
section for exact states and verification; older sections describe prior checkpoints.


Updated 2026-09-06. The searchable catalog, core equipment workflows on both
bodies, customization and local release candidate are implemented and verified
for the combinations recorded in backend STATUS.md. Gelo's local saved-appearance
preview was reviewed by the user and accepted for now despite shader differences.
Shader parity remains unresolved. Source commits are authorized; deployment is not.

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

`/outfits` provides a searchable catalog, transactional equipment slots, body
cutting, shared skeletons, authored hair/hat forms, faces and expressions, dyes,
backgrounds, six baseline clips and PNG capture. The local release-02 library
contains 124 models, with 46 reviewed item/body entries, 54 previews and 12
unavailable entries. Both bodies have recorded complete-outfit visual checks.

The development-only `/outfits?preview=gelo-01` loads eight appearance items
and saved colors from local `tria-game-server`. Back sign, blush, paired Fire
Prism Stars and effects are explicitly omitted. Generated libraries and the
saved character snapshot remain local ignored artifacts, outside source commits.
See [backend status](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/STATUS.md)
for exact IDs, evidence and limitations. Publishing requires separate approval.

## Reference research

The original investigation is preserved in
[the archived Plan 08](research/08-outfit-simulator-before-completion-plan.md).
It contains earlier reference-site and bundle observations, not current acceptance
criteria. Claims that the frontend only needs bookkeeping or that no further
material work is needed are superseded by the completion plan.

Targeted live reference checks covered hair/hat state, robe conflicts and saved
dyes. Reference canvas and expression verification remained inconclusive. Backend
STATUS.md separates those limitations from own-client data and T3 evidence.
