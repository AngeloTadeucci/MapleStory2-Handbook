# Plan 09: Native NIF-to-glTF conversion

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
