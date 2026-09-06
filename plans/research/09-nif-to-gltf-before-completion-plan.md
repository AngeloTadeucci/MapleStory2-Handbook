# Plan 9: Our own NIF to glTF converter

**Status:** Native geometry/material decoding expanded, curated player clips
extracted, animated manifests and actual viewer/shared-skeleton integration
implemented on 2026-09-06. Full-library fidelity remains incomplete.

The backend `NifToGltf/Native/README.md` contains the CLI and output contract.
`NifToGltf/Diagnostics/batch-results.json` records every rejected static input.
Noesis remains the default; use `--native` to select the new converter or
`--noesis` to select the fallback explicitly. Backend `Native/STATUS.md` records
current evidence and `Diagnostics/non-effect-results.json` records the scoped run.

| Step | Verified progress | Remaining |
|---|---|---|
| 0 | All 2,830 headers/streams scanned; nine formats decoded; female body exported and rendered | Original four-format premise was false and was revised with user authorization |
| 1 | Body hierarchy, bind transforms, palettes and source bone names tested | Full-library skinning fidelity still needs visual coverage |
| 2 | Embedded pixels, UV transforms, software skinning, strips, tangents, morphs and source default colors; client XML attachments | Full material/face behavior and private equipment bones |
| 3 | Thirteen rabbit clips and six curated player clips per gender; player archives found | TCB quaternion curves, duplicate sequence selection and visual/root-motion acceptance |
| 4 | 2,626 scoped exports with zero glTF errors/warnings; animated batch plans | 1 effect excluded, 2 missing, 201 failed; wider visual comparison |
| 5 | Native manifests in actual viewers; `/outfits` shares skeletons and exposes color controls; 22 focused frontend tests pass | Remaining simulator customization and appearance acceptance |

Default skin/dye colors now use the client ColorOverride formula, and source
alpha blending is retained. Face selection, expression animation and full
lighting are still incomplete. Passing glTF validation does not establish
appearance parity. T3 loaded the actual rabbit viewer with thirteen clips;
snapshots initially failed, then canvas capture verified the female body, hat,
clothing fitting pose and torso recoloring. Full client appearance parity is
still unverified. Seven opaque color bakes match byte-for-byte; the transparent
face map differs by up to three bytes after browser canvas decoding.
Balrog's all-clips export rejects four TCB clips and `Attack_Idle_A.kf`, which
contains two same-named sequence roots with different durations.

**Scope:** High, backend only. Replaces Noesis with a converter we own. Unblocks
[08-outfit-simulator.md](08-outfit-simulator.md) and improves the existing model viewer on its own.

This plan is the backend half. Read [08-outfit-simulator.md](08-outfit-simulator.md) for why the
current exports are unusable and what the frontend eventually does with the output.

## Why replace Noesis

`NifToGltf/Program.cs` shells out to `noesis.exe` once per file through `ProcessStartInfo`. Noesis is
a closed binary, so a bad export cannot be debugged, only worked around. It is the direct cause of
three problems:

1. **Bone names are lost.** Clothing NIFs contain correct `Bip01` bone names in their string table,
   but our exports rename roughly 40 percent of the skin joints to `Biped Object@#N`. An animation
   clip targeting `Bip01 Head.rotation` cannot bind to a node named `Biped Object@#7`.
2. **Rigid gear gets no skeleton.** Hats, hair, capes and weapons have no bones in the source by
   design. They need one grafted at conversion time, bound to their attach point. Noesis will not do
   this.
3. **Every animation duplicates the whole mesh.** On `02030005_balrog` the animation data is 68,416
   bytes inside a 1,133,832 byte file, so 94 percent is a copy of the mesh that already exists in the
   base file.

Owning the writer turns all three from impossible into an export setting.

## The format is already decoded

MS2 NIFs are `Gamebryo File Format, Version 30.2.0.3`, stated in ASCII in the first 38 bytes. This is
a public format and the version appears in the niftools `nif.xml` spec. The decode below was worked
out directly from the bytes with no library.

### Header

```python
d = open(path,'rb').read()
i = d.index(b'\n')+1                                    # version string line
off = i + 4 + 1 + 4                                     # version u32, endian u8, userVersion u32
nb  = struct.unpack_from('<I', d, off)[0]; off += 4     # numBlocks
metadata = struct.unpack_from('<I', d, off)[0]; off += 4
off += metadata                                         # metadata bytes, nonzero in 137 files
nbt = struct.unpack_from('<H', d, off)[0]; off += 2     # numBlockTypes
types = []
for _ in range(nbt):                                    # length-prefixed strings
    ln = struct.unpack_from('<I', d, off)[0]; off += 4
    types.append(d[off:off+ln].decode()); off += ln
tidx  = struct.unpack_from('<%dH'%nb, d, off); off += 2*nb   # block type index, mask & 0x7FFF
sizes = struct.unpack_from('<%dI'%nb, d, off); off += 4*nb   # block sizes
nstr  = struct.unpack_from('<I', d, off)[0]; off += 4        # numStrings
off += 4                                                     # maxStringLength
strs = []
for _ in range(nstr):
    ln = struct.unpack_from('<I', d, off)[0]; off += 4
    strs.append(d[off:off+ln].decode('latin1')); off += ln
ngroups = struct.unpack_from('<I', d, off)[0]; off += 4      # 0 in every file seen
# block data follows; walk it with sizes[]
```

Verified on `f_body.nif`: 253 blocks, 18 block types, 129 strings, and the block sizes sum to within
8 bytes of the file length. The header parsed cleanly on **585 of 586** NIFs across `Item/`,
`Character/` and a 200-file sample of `Npc/`.

### Block types in use

18 types in `f_body.nif`. The full scan found 84 encoded type names, or 73
classes after collapsing `NiDataStream` variants. Effects, morphs and physics
are present and require more than the body reader's supported surface.

```
NiNode, NiMesh, NiSkinningMeshModifier, NiDataStream018, NiDataStream118, NiDataStream33,
NiSourceTexture, NiTexturingProperty, NiMaterialProperty, NiAlphaProperty, NiZBufferProperty,
NiVertexColorProperty, NiSpecularProperty, NiTransformController,
NiStringExtraData, NiColorExtraData, NiFloatExtraData, NiIntegerExtraData
```

### NiDataStream

This was expected to be the hard part. It is self-describing.

```
numBytes         u32
cloningBehavior  u32
numRegions       u32
regions          [numRegions] of (startIndex u32, numElements u32)
numComponents    u32
componentFormats [numComponents] u32
data             numBytes of raw vertex or index data
streamable       bool, one byte
```

The component format u32 encodes its own layout. Bits 16 through 23 are the
component count; bits 8 through 15 are bytes per component:

| Format | Meaning | Size |
|---|---|---|
| `0x00010215` | 1 x u16 | 2 |
| `0x00020436` | 2 x f32, UV | 8 |
| `0x00030437` | 3 x f32, position / normal / tangent / bitangent / weights | 12 |
| `0x00040108` | 4 x u8, bone indices | 4 |
| `0x00010425` | 1 x u32 | 4 |
| `0x00010435` | 1 x f32 | 4 |
| `0x00040110` | 4 x normalized u8 | 4 |
| `0x00040214` | 4 x i16 | 8 |
| `0x00040438` | 4 x f32 | 16 |

Summing component sizes gives the vertex stride, and it equals `numBytes / numElements` exactly.

Originally sampled on the `GL` hand mesh of `f_body.nif`, 466 vertices at a
72-byte stride over 7 components. The main `CL_Skin` has 317 vertices and 434
triangles; the complete body has 2,034 vertices and 2,762 triangles:

- **Positions**, X from -42.18 to 42.18, plausible MS2 character units.
- **Bone weights**, the trailing `f32x3`, summing to 1.0 on 50 of 50 sampled vertices.
- **Bone indices**, the `u8x4` slot, values 0 to 19.
- **Triangles**, 1,440 indices so 480 triangles, maximum index 465 against 466 vertices, in range.

The completed scan found the nine formats above in 28,161 streams across all
2,830 NIFs, with no header or stream-boundary failures. Storage types alone do
not identify semantics; the converter resolves each mesh's semantic bindings.

## Local assets

2,830 NIFs are staged under `Maple2Storage/Resources/Models/`:

| Directory | Count |
|---|---|
| `Npc/` | 2,295 |
| `Item/` | 385 |
| `Effect/` | 108 |
| `Map/` | 39 |
| `Character/` | 2 |
| `Textures/` | 1 |

Textures sit beside them as DDS with `_d` diffuse, `_n` normal, `_s` specular and `_c` control mask.
The `_c` file is the dye mask the outfit simulator needs, for example
`Textures/item_clothes/11400001_f_basicsportweartop_c.dds`.

Animations are `.kf` files, and `.kfm` files map an animation set to a model. `dummymale.kfm` is 121
bytes and references `.\Dummy.nif` plus `.\Idle_A.kf`, so the player animation set is assembled from
separate `.kf` files rather than living in one model. `anikeyinfo/dummymale.xml` lists all 1,995
animation names with durations, which is the index for choosing which to convert.

## What the converter must produce

Beyond a faithful mesh, three requirements come from the outfit simulator. Design for them now, since
retrofitting means re-converting 2,830 files.

1. **Preserve `Bip01` bone names.** Never emit `Biped Object@#N`. The names are in the NIF string
   table.
2. **Graft skeletons onto rigid gear.** Hats, hair, earrings, capes and weapons have no bones. Read
   the attach node from the string table, a hat has `CP`, a cape has `MT`, then emit the body bone
   tree with a single-joint skin bound to the matching bone, `CP` to `Bip01 Head`. Bone names must
   match the body exactly so one animation clip drives body and equipment together.
3. **Merge animations into one glTF.** The glTF `animations` array holds any number of named clips.
   Emit the mesh once and append every clip. For NPCs merge all of them, Balrog goes from about 70 MB
   across 65 files to about 5.3 MB in one. For the player skeleton do **not** merge all 1,995, that
   is roughly 131 MB. Merge a curated subset instead.

The sampled clothing names a subset of the body bones. The native converter
checks every joint against the supplied body by name and rejects missing
matches. The clothing regression proves this for its male body fixture; it
does not establish compatibility across the entire library or every body variant.

## Build order

**Step 0 is a go or no-go gate. Do not start step 1 before it passes.**

0. **Prove the decode end to end on one file.** Convert `Character/female/f_body.nif` to a glTF with
   correct positions, normals, UVs, bone indices, bone weights and triangles, then load it in the
   Handbook viewer and confirm it renders as a body. Also scan component formats across all 2,830
   NIFs. The original four-format assumption failed; continuation was authorized
   after revising it to the nine observed storage types.
1. **Node tree and skinning.** `NiNode` hierarchy with transforms, `NiSkinningMeshModifier` for the
   bone list and bind matrices, `NiMesh` to tie meshes to their streams and materials.
2. **glTF writer.** Emit the layout we want, with the three requirements above built in.
3. **Animation.** `.kf` and `.kfm` parsing, `NiTransformInterpolator` and `NiSequenceData`. Can land
   after static meshes, since static output is already useful.
4. **Batch convert** all 2,830 NIFs. Keep the Noesis path runnable until output matches or beats it.
5. **Hand off to the frontend.** See plan 08 for what happens next.

## Verification

Do not trust a converter that produces files without errors. Check the output:

- Vertex and triangle counts match what the NIF declares.
- Maximum index is less than the vertex count.
- Bone weights sum to 1.0 per vertex.
- Every skin joint keeps its source name, including validated helper bones
  such as `SATA9NI_Bone01`. Do not require the `Bip01` prefix for all joints.
- Bone names in equipment are a subset of the body bone list.
- A/B render against the current Noesis output for a sample of NPCs, since those exports are known
  good today.

## Note on `VulkanRayTracing.exe`

`D:\Projetos\MapleStory2\NifExporterDebug\` holds a 2022 binary that converted 11,375 MS2 NIFs to
FBX, with the project name `Nif-Converter` in its strings. Origin unknown, no source, and FBX is the
wrong target. Recorded only as evidence that a third-party reader for this format was written before.
Do not spend time on it.
