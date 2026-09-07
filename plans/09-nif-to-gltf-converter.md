# Plan 09: Native NIF-to-glTF conversion

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


## Accepted implementation checkpoint, 2026-09-06

The catalog, equipment/customization workflows and local release-02 candidate
are implemented. Both bodies have recorded visual checks. The user accepted
Gelo's saved-appearance preview for now despite remaining shader differences
and authorized source commits and plan updates. Shader parity and the explicitly
omitted Gelo items remain follow-up work. Generated assets remain local and
ignored. Publishing requires separate authorization. Read backend STATUS.md
for exact evidence; earlier requirements below describe scope, not undone phases.


Updated 2026-09-06. Complete Noesis replacement remains unfinished. Simulator
completion now takes priority and may ship with individual assets unavailable.

## Current sources of truth

- [Implementation and commands](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/README.md)
- [Measured results and remaining blockers](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/STATUS.md)
- [Current simulator implementation order](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/SIMULATOR-PLAN.md)
- [Original replacement requirements with current scope notice](../../MapleStory2-Handbook-BackEnd/NifToGltf/Native/CONTINUE.md)

Native conversion remains opt-in. The existing Noesis path is still the default,
and `--noesis` selects it explicitly. No global default switch or deployment has
been completed.

## Implemented foundation and measured coverage

Native conversion covers geometry, skinning, DDS textures, source color masks,
XML-directed attachments, canonical skeleton grafting and selected merged clips.
The frontend consumes native manifests in its viewers and outfit preview.

The latest scoped static batch reports 2,626 converted, one excluded effect,
two missing inputs and 201 failures out of 2,830 files. All 2,626 exports validate
without errors or warnings. These are structural checks, not appearance approval.
Acceptance-06 separately covers twelve exports with current simulator fixes.
See STATUS for the exact tests, source limitations and visual evidence.

## Work required for simulator completion

Follow the five phases in the current simulator plan. Backend priorities are
item identity and multi-part catalog export, useful coverage across core slots
and both bodies, equipment/cutting metadata, selected private-bone support,
hair/face customization data and reproducible supported-library builds.

Frontend catalog, dressing rules and customization can proceed using supported
assets. Converter failures become release blockers only when required simulator
features or selected release assets depend on them. Record unavailable assets;
do not present malformed, frozen or incompatible results as supported.

## Wider replacement backlog

Retain the unresolved reflection/NiTextureEffect, billboard and camera behavior;
TCB and duplicate animation-sequence handling; private equipment bones and mixed
rigid/skinned cases; ambiguous or missing textures; and invalid source geometry.
STATUS records concrete examples and the latest failure breakdown. These are
real unresolved issues, not silently completed work.

Effects and particle simulation remain excluded. A directory named Effect does
not automatically make ordinary geometry an excluded effect. Track exclusions,
missing inputs and failures separately from successes.

Before switching the converter globally, verify the intended non-effect asset
classes, actual consumers, appearance and animation behavior. Simulator release
does not require that broader switch.

## Historical specification and research

The previous plan is preserved in
[the archived Plan 09](research/09-nif-to-gltf-before-completion-plan.md).
Use its format notes as research leads and confirm them against current source.
Its earlier estimates, counts and dependency ordering are superseded by STATUS
and the current simulator roadmap.
