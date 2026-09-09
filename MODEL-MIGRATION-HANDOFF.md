# Continue the model migration on the PC

Use `feat/model-migration-pc-handoff` in both this repository and
`AngeloTadeucci/MapleStory2-Handbook-BackEnd`.

The full handoff is in the backend at
[NifToGltf/Native/MODEL-MIGRATION-HANDOFF.md](https://github.com/AngeloTadeucci/MapleStory2-Handbook-BackEnd/blob/feat/model-migration-pc-handoff/NifToGltf/Native/MODEL-MIGRATION-HANDOFF.md).
It covers ignored asset/report transfer, WSL setup, validation, the full-copy
build's 82.9-GiB free-space requirement, and remaining acceptance gates.

The VM review server was stopped. No deployment was performed. The final isolated
candidate has 13,249 native assets, but 575 source-model records remain unresolved
and the simulator separately has 5,302 unavailable item/body entries. Keep the
legacy viewer fallback and Noesis until coverage and client-parity checks pass.

Start with Olympus Divinity Wings: the standalone model now converts, but its
male/female simulator entries still contain an old duplicate-animation error.
Regenerate the body-bound exports and catalog before making them equipable.
More disk space is not the blocker for that targeted retry.

Last verification: 387 frontend tests passed, seven fixture-dependent skips;
typecheck passed; compiled browser checks passed against the final package.
These results do not establish visual parity for every converted model.
