# Plan 10: Clothing simulator completion

Current handoff, 2026-09-07: the user authorized committing and pushing candidate
14 on the existing feature branches. Oracle preview servers on ports 4000, 4002
and 4003 are stopped. No deployment is authorized. See backend STATUS.md for
current testing instructions; server-running and no-commit statements below are
historical checkpoints superseded by this handoff.

## Implemented wardrobe candidate 14, 2026-09-07

The source inventory owns identity, eligibility, slots and pagination; DB rows
supply labels through SELECT reads only. All 19,268 scoped IDs and 33,170 eligible
body pairs are searchable, including 118 IDs absent from the DB, 535 blank DB names
and 746 explicitly nonvisual pairs. Unusable names have numeric fallbacks and
missing icons use placeholders. Actual model slots include previously omitted
FH/EY/PD/RI/BE/ER. Shared models retain every item identity.

The selected simulator-release-14 contains 9,329 assets and 7,078 usable bundle
families. Labels remain 80 inherited reviewed, 27,788 preview and 5,302 unavailable.
Authored palette defaults/cycles/reset, face expressions, makeup masks/placement/
size, source hair forms, equipment clip selection and source attachment repairs
are implemented. Fixed source hair scales do not expose adjustable controls, and
adjustable hair lengths have a native-default reset. Existing shader and hair-twinkle effects are preserved. Source
failures and limitations remain visible. No new visual acceptance was granted.

Candidate 14 passes 115 logic/source tests, all 9,327 equipment asset cases,
and 9,329 glTF validators with zero errors or warnings. Typecheck reports zero
errors and warnings. Final build-14c and compiled public UI workflows pass on
both bodies, including native hair-length reset. The detailed development workflow
passes 17 states, including private Gelo. Contact sheets covering 42 outfit cases
and 77 distinct item/body pairs were inspected. New visual acceptance remains zero.
Read backend STATUS.md and Diagnostics/wardrobe-release-report.json for exact IDs,
source evidence, counts, commands and remaining blockers.

The compiled candidate runs at http://127.0.0.1:4003/outfits. Its 12,146 packaged
files match release hashes. It packages only simulator-release-14; actual private
Gelo and baseline release URLs return 404. Development preview 127.0.0.1:4002 is
separate from the untouched 4000 review build. Release-05 and Gelo-07 have 1,273
unchanged file hashes. T3 has no automation host here; Oracle Playwright workflows
passed. No commit, push, merge, deploy or database write is authorized or performed.
Preserve the preparation notes and test fixes below as historical setup evidence.
Historical publishing authorization below is superseded by the current request.

## Oracle workspace checkpoint, 2026-09-07

The feature branch is prepared at `/home/ubuntu/repos/MapleStory2-Handbook`,
alongside the backend. Source the backend's NifToGltf/obj/oracle-prep/env.sh.
The loopback review build serves 127.0.0.1:4000; it does not hot reload. All 249
frontend tests pass with the transferred asset fixtures. The existing nested
unescapeHtml test suite was corrected. Complete nine-item outfits on both bodies
were exercised in Oracle Chromium and their screenshots inspected. The private
Gelo snapshot is staged but requires the development-only preview route.
Read backend STATUS.md for exact items, verified files, database read-only
restrictions, cross-platform export differences and the known /icon0.png 404.
Preparation does not implement the wardrobe expansion or authorize publishing.

## Next priority: full wardrobe coverage, 2026-09-07

The user requested a plan for all clothing and wearable decorations before
save/load and sharing. The authoritative implementation order and exit checks
are in the backend's NifToGltf/Native/SIMULATOR-PLAN.md, section "Current plan:
complete clothing and decoration coverage". This update is planning only.

1. Reconcile the entire client inventory, keeping every item/body entry even
   when geometry is shared, unresolved or nonvisual. Measure the true denominator.
2. Make every scoped item discoverable. Replace DB-name/slot coverage assumptions
   in the outfit API with the reconciled source catalog; keep pagination and
   availability counts consistent. No database writes are needed.
3. Convert reusable families with complete item-specific attachment, cutting and
   customization records. Use bounded, reproducible batches and fresh candidates.
4. Resolve high-coverage compatibility failures and the existing 35 previews/
   10 unavailable entries. Preserve complete outfits, dyes and accepted effects.
5. Review distinct visual bundles and both eligible bodies, using contact sheets,
   direct T3 interaction, exact source checks and targeted reference comparisons.
6. Prepare a reproducible expanded source/asset release, measure catalog and
   outfit loading at scale, and verify the actual production package.

The UI must distinguish missing geometry from an omitted optional effect, expose
unsupported items clearly and never substitute another item. Badges remain
excluded. Known broken geometry cannot be promoted by validator/typecheck success.
The current 127 item/body entries are a subset, not a full coverage denominator.
Generated assets and private snapshots remain local. No commit, push or deployment
is authorized by this planning request.

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
