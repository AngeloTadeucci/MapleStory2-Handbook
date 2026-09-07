# Plan 10: Clothing simulator completion

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
are in backend STATUS.md and Diagnostics/refine_simulator.py. The user authorized
committing this checkpoint on 2026-09-06. No publishing, production write or
existing-process stop occurred. Older sections
below describe earlier checkpoints.

Production packaging passes `pnpm build`. scripts/simulatorAdapter.js copies only
the selected gltf release and preserves ordinary application assets. The shared
selection is src/lib/outfits/simulator-release.json, inside Vite's allowed source
tree. All 620 packaged files match the inventory hashes. The adapter regression
test passes, bringing the focused frontend total to 193. Gelo loaded again after
the packaging change; the 390x844 mobile preview shows all twelve saved instances
without horizontal overflow. The final Henesys/Happy PNG check timed out in an
invisible T3 tab and is not additional acceptance evidence. No deployment occurred.


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
