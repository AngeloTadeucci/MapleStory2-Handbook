# Plan 10: Clothing simulator completion

Review checkpoint, 2026-09-07: the user authorized committing and pushing on
`feat/clothing-simulator`, branched from local master with the four earlier
simulator commits preserved. The backend uses the same branch name. Generated
client assets and Gelo's private appearance snapshot remain local and ignored.
Deployment is not authorized.

## Character surface correction, 2026-09-06

Implemented the requested shader fix without changing geometry, dyes or hair
effects. Character materials use authored ambient independently of diffuse,
Fresnel rim parameters and the hair direction map's anisotropic highlights.
The source character_spring2019 scene's inherited white ambient/directional
coefficients are 0.8. They replace the dark hemisphere fill, with consistent
Three irradiance conversion for diffuse and specular. Key and rim directions
remain documented studio choices; skin subsurface and exact client global
values are not claimed reproduced.

Gelo's twelve saved instances and a complete male outfit were checked from three
angles. Male10200121 plus hat11300001 keeps C hair and explicit blue dye; six
hair replacement cycles stay at 22 geometries/63 textures. Gelo Happy/Henesys
with star_attack_idle_a at 0.65 seconds exports a decoded 823x520 PNG, effects
enabled. Backend STATUS.md records item IDs, source hashes and local captures.
214 focused tests passed, with 15 material/effect tests rerun after the final
correction. Typecheck is clean. Eleven GPU checks pass, including full material
pixels that catch ambient being multiplied by diffuse and inconsistent light
units. Rerun them in T3 by importing
`/src/routes/dev/nif-converter/characterShaderAcceptance.ts`, then calling
`verifyCharacterShader()` and `await verifyCharacterLightingPipeline()`.
The release-05 asset inventory remains unchanged at 635 files.
The final production build passes; all 635 packaged files match the inventory.
Only simulator-release-05 is packaged under gltf.

## Hair effects pilot, 2026-09-06

The user authorized effects and excluded badges. Default simulator-release-05
adds the source hair-twinkle family for 10200121/10200122 male and
10200123/10200124 female.
Gelo is `/outfits?preview=gelo-07`. Two particle emitters and the animated glow
follow the source head attachment. The Hair effects checkbox hides/freezes them.
Badges have no loader or selector. New hairstyles remain under Available models.

The release contains 153 models, 82 reviewed geometry entries, 35 previews and
10 unavailable entries. All 635 files reproduce byte for byte. 211 focused tests,
including source asset binding and nine effect tests, pass; typecheck is clean.
Both bodies were exercised with full outfits and hat fitting. Removal clears the
effect; a forced load failure preserves the existing outfit. Playback recording
and exact item/state evidence are in backend STATUS.md. Particle randomness,
drag, billboard orientation and full material parity remain unverified against
the running client. No effects commit or deployment occurred.
The production build passes and all 635 packaged files match inventory hashes.
Gelo's enabled-effects Henesys/Happy PNG decoded successfully at 823x520.

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
