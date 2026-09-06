# Plan 8: Outfit Simulator (Dress-Up / Coordi)

**Status:** Native shared-skeleton consumer implemented at `/outfits` on
2026-09-06. Clothing selection now uses current-client hoodies, preserves
CL_Skin, replaces the corresponding body parts and shares the body skin palette.
The male arm/hand seam is checked at sixteen vertices through three poses.
Twenty-eight focused frontend tests pass. The prior staged male shirt has an
incompatible wrist shape; the female test mesh lacked textures and UVs.

Previous checkpoint:
2026-09-06. Twelve acceptance exports and eight real equipment deformation
comparisons pass. Source-mask color controls and reset are implemented. The
female body, hat, clothing pose and torso recoloring were captured in T3.
The male five-item capture exposes hair/hat intersection; cap fitting remains
an acceptance failure.
Client material/face behavior, private animated equipment
bones and visual acceptance remain incomplete. The research below is historical;
the current contract and blockers are in backend `NifToGltf/Native/STATUS.md`.

**Scope:** High. Requires a change to the NifToGltf export pipeline first, then a new frontend
renderer. The frontend work is small once the assets are correct.

Goal: let a player equip multiple cosmetics on a character model at once, animate it, dye it, and
screenshot it. Today `ItemRenderer.svelte` shows one item alone in `<model-viewer>`.

## Prior art: hunya.duckdns.org

A Korean fan built this already and it works. Title `후냐 시뮬레이터 - MapleStory2 코디 시뮬`. It is
not indexed by search engines because it runs on a DuckDNS dynamic-DNS host, which is why we never
found it. Everything below was read out of its production bundle at
`https://hunya.duckdns.org/assets/index-DRJFr7MV.js`, 933 KB, no source map, and confirmed by
fetching its assets directly.

Stack: plain Three.js r175, `GLTFLoader`, `OrbitControls`, Vite, no framework. Tone.js for audio.
Assets on a public Cloudflare R2 bucket. No backend and no API.

### How it equips multiple items: one clip, many mixers

This is the whole trick and it is not what you would guess. There is no skeleton re-binding and no
re-parenting of meshes.

Every equipment GLTF ships with **its own full copy of the MS2 Bip01 skeleton**. Their hat
`11300001_C_AdventurerCap_C.gltf` has 138 nodes for one mesh, because 137 of them are the biped
hierarchy. The skin references only 2 joints, `Bip01 Head` and `Bip01`, but the whole bone tree is
present so that node names line up across files.

Equipping adds the item as a **separate scene object** with **its own `AnimationMixer`**, then plays
**the same clip** on every mixer:

```js
kt[2] = new AnimationMixer(equipScene);   // one mixer per equipment slot, 20 slots

// broadcast one clip to the body mixer and every equipment mixer
var n = qs.clipAction(clip); n.play();                  // body
kt.forEach(s => { s && (n = s.clipAction(clip)).play() });  // each equipped item
```

The render loop steps them all with the same delta:

```js
qs.update(u);                       // body
kt.forEach(p => p && p.update(u));  // equipment
```

Identical bone names plus identical rest pose plus the same clip and the same delta means the pieces
stay locked together. Nothing is parented to anything.

Motion files are skeleton-only. `idle_a.gltf` has 137 nodes, **zero meshes**, and one animation with
411 channels targeting `Bip01.translation`, `Bip01 NonAccum.rotation` and so on. Poses load once and
broadcast.

### Track filtering

Before playing, they strip tracks from every clip:

- All `.scale` tracks on `Bip01_Head`, the arms, the legs and the feet, so items do not inherit body
  morph scaling.
- `Scene_Root.translation`, so walk and run play in place instead of moving off camera.

### Two-texture dyeing

MS2 dyeing is two colours per item, reproduced on a 2D canvas before upload. Each item has a diffuse
`_d.png` and a control mask `_c.png`. The mask red channel is the blend weight:

```js
const S = maskData[i];              // red channel 0-255
v.r = c1.r*(S/255) + c2.r*(1-S/255);
v.g = c1.g*(S/255) + c2.g*(1-S/255);
v.b = c1.b*(S/255) + c2.b*(1-S/255);
```

The tinted result is drawn over the diffuse, and the canvas becomes a `CanvasTexture` with
`flipY = false`, `anisotropy = 16`, `colorSpace = "srgb"`. The overlay is skipped when the mask
filename equals the diffuse filename.

### Body part hiding

Equipping hides base body geometry by name prefix rather than removing it:

```js
body.traverse(n => {
  if (n.isMesh) {
    n.name.startsWith("CL") && (n.visible = false);
    parseInt(clId) >= 12200000 && n.name.startsWith("PA") && (n.visible = false);
  }
});
```

Item ids at or above `12200000` are one-piece outfits, so equipping one also force-clears the pants
slot and hides the `PA` mesh.

### Their data layer

Flat CSV served as static files at `/itemDB/<SLOT>.csv`, one per slot, filtered client-side and
capped at 50 results:

```
#id,name,icon,r1,g1,b1,r2,g2,b2,gltf,ddsd,ddsc,haircutting,
11300001,초보자 벙거지,11300001,63,59,51,20,18,15,11300001_C_AdventurerCap_C.gltf,...
```

2,700 hats, 2,636 tops, 2,423 shoes, 2,260 gloves. All state in `localStorage` under keys like
`CL_old_model` and `CP_new_R1`, with `old` and `new` variants driving the equip-change transition.

Slot codes: `CP` hat, `EY` eye decoration, `CL` top, `PA` bottom, `MT` cape, `WP1`/`WP2` weapons,
`HR` hair, `MU` decoration, `FF` face shaping, `SK` skin, `EA` earrings, `FA` face accessory,
`GL` gloves, `RN` ring, `SH` shoes, `SX` gender, `PO` pose, `FE` expression, `BK` background.

## The blocker: our equipment exports carry no usable skeleton

Our pipeline can already emit named `Bip01` bones. NPC exports do it. `02030005_balrog` has 130
nodes with 77 `Bip01*` bones, and its `idle_a.gltf` has 136 channels driving
`Bip01 NonAccum.translation` and `Bip01 Pelvis.rotation`. So this is not a missing Noesis capability.
It is per-asset, and equipment is the case that fails.

Compare the same hat, `11300001`, from both CDNs:

| | Ours (`cdn.tadeucci.dev`) | Theirs |
|---|---|---|
| Nodes | 4 | 138 |
| Nodes named `Bip01*` | 0 | 70 |
| Skin joints | 2: `Editable Poly`, `Scene Root` | 2: `Bip01 Head`, `Bip01` |
| Geometry buffer | 60,404 bytes | 60,404 bytes |
| Textures | embedded, `_tex00`/`_tex01` | external |

The geometry buffer is byte-identical, so both came from the same NIF through the same tool. Only
the skeleton differs. The hat has no biped hierarchy at all, so no clip can drive it.

Clothing is a different failure. `11400001_f_basicsportweartop` has 135 nodes and 53 skin joints, and
the skin binds a **mix**:

- 28 joints correctly named `Bip01 Pelvis`, `Bip01 Spine`, `Bip01 L Hand`, `Bip01 Head`.
- 20 joints named `Biped Object`, `Biped Object@#0` through `Biped Object@#18`.
- 3 named `SkinData_CL`, `SkinData_PA`, `SkinData_SH`, plus `Scene Root` and `SATA9NI_Bone01`.

The `Bip01` half would bind to a clip. The `Biped Object` half would not, so roughly 40 percent of
the mesh would stay in bind pose while the rest animates. The `Bip01` tree in that file is also
detached from the mesh nodes, since `Bip01` has exactly one child, `Bip01 NonAccum`, while every mesh
node sits at the scene root.

### Root cause, found by reading the NIFs directly

The source NIFs explain both failures. Surveying all 385 equipment NIFs under
`Maple2Storage/Resources/Models/Item/` by parsing their string tables:

| Prefix | Slot | Files | With `Bip01` bones |
|---|---|---|---|
| 116 | gloves | 60 | 60 |
| 117 | shoes | 58 | 58 |
| 122 | outfits | 60 | 60 |
| 114 | tops | 4 | 4 |
| 115 | bottoms | 1 | 1 |
| 113 | hats | 47 | **0** |
| 112 | earrings | 50 | **0** |
| 102 | hair | 9 | **0** |
| 118 | capes | 23 | **0** |
| 131-156 | weapons | ~45 | **0** |

Two distinct cases, and they need different fixes.

**Skinned gear already has bones in the source.** Gloves, shoes, tops, bottoms and outfits each carry
a `NiSkinningMeshModifier` and a partial `Bip01` bone list. A clothing NIF names only the bones it
actually deforms, 28 to 30 of the body's 52, and **every one of those names is a subset of
`f_body.nif`'s bone list**, verified by set comparison. So the names exist in the source and our
Noesis run is losing or renaming them. That matches the export we have, where 28 joints kept their
`Bip01` names and 20 became `Biped Object@#N`.

**Rigid gear has no bones at all, by design.** Hats, hair, earrings, capes and weapons have no
`Bip01` strings and usually no skinning modifier. They attach to a single point instead. Their string
tables name the attach node directly: a hat has `CP` and `Main_A`, a cape has `MT` and `MT_Point01`.
The hunya export handles this by giving the hat a full 138-node skeleton with a 2-joint skin bound to
`Bip01 Head`, which is a conversion-time graft, not something present in the source NIF.

So the fix is two-part, and neither part is a Noesis flag hunt:

1. **Skinned gear:** stop the rename. The bone names are in the NIF, so the conversion must preserve
   them rather than fall back to `Biped Object@#N`.
2. **Rigid gear:** graft the skeleton. Read the attach node name from the NIF, then emit the body
   bone tree and a single-joint skin binding to the matching bone. `CP` maps to `Bip01 Head`. This is
   exactly what their hat file contains.

**Nothing downstream works until one hat and one top come out with a complete named `Bip01` tree and
a skin that binds only to it.** That work lives in
`MapleStory2-Handbook-BackEnd/NifToGltf/Program.cs`, or in a replacement converter, see below.

## Shading and lighting

There is no custom shader anywhere in their bundle. No `ShaderMaterial`, no `onBeforeCompile`, no
GLSL. The MS2 look comes entirely from lighting and texture filter settings applied to whatever
material `GLTFLoader` produced.

The full scene setup, read out of their `fd()` init function:

```js
scene.background = textureLoader.load(`${R2}/resources/background/${bg}/${bg}_img.png`);

camera = new PerspectiveCamera(30, 1, 0.01, 9999);   // narrow 30deg FOV
camera.position.set(-150, 120, 320);

ambient  = new AmbientLight(0xffdd9d, 2);            // warm, strong
keyLight = new DirectionalLight(0xffffff, 4.5);
keyLight.position.set(0, -1000, 1000);               // note: negative Y
fillLight = new DirectionalLight(0xffffff, 2);
fillLight.position.set(0, 1000, 1000);

renderer = new WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });

scene.rotation.x = -Math.PI / 2;                     // Z-up source data to Y-up
camera.lookAt(new Vector3(0, 70, 0));

controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.8;
controls.target.set(0, 70, 0);
```

Three lights only. A warm ambient at `0xffdd9d` intensity 2 carries most of the flat look. The key
directional sits at negative Y, which is below the model before the `-PI/2` scene rotation, so after
rotation it reads as a front light. No shadow maps are enabled on the character, no environment map,
no tone mapping override, and no `outputColorSpace` change. The `logarithmicDepthBuffer` flag exists
to stop z-fighting between the large background mesh and the character.

Per-mesh treatment differs between background and character:

```js
// background: kill PBR response so it reads flat like the game
background.traverse(o => { if (o.isMesh && o.material.map) {
  o.material.map.minFilter = LinearMipmapLinearFilter;  // 1008
  o.material.map.magFilter = LinearFilter;              // 1006
  o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  o.material.metalness = 0;
  o.material.roughness = 1;
}});

// character body: same filtering, plus double-sided
body.traverse(o => { if (o.isMesh && o.material.map) {
  o.material.map.minFilter = LinearMipmapLinearFilter;
  o.material.map.magFilter = LinearFilter;
  o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  o.material.side = DoubleSide;                         // 2
}});
```

`metalness = 0` and `roughness = 1` on the background is what removes the specular sheen that
otherwise makes glTF PBR look wrong for this art style. Character meshes get `DoubleSide` because MS2
clothing geometry is frequently single-sided and would show holes otherwise.

Dyed textures get their own settings when uploaded from the canvas: `flipY = false`,
`anisotropy = 16`, `colorSpace = "srgb"`, `generateMipmaps = false`.

Materials are cloned before assignment so that two meshes sharing a glTF material do not receive the
same dye: `mesh.material = mesh.material.clone(); mesh.material.map = dyedTexture;`. Skin meshes also
get `material.color = new Color(0xffffff)` to neutralise any tint baked into the glTF material.

Implication for us: no shader work is required. Reproducing the look is a matter of copying these
light values and the four texture settings. If we later want the harder-edged cel look of the retail
client, that would be new work with `MeshToonMaterial` or a custom shader, and they did not do it.

## One GLTF with all animations

Worth doing, and it is a real win for NPCs. Our current export duplicates the entire mesh into every
animation file.

Measured on `02030005_balrog`:

| | Bytes |
|---|---|
| Base model `.bin` | 1,065,416 |
| `idle_a.gltf` `.bin` | 1,133,832 |
| Of which is actual animation data | 68,416, which is 6.0 percent |
| Mesh duplicated per animation file | 1,065,416 |

The node arrays of the base file and the animation file are identical in name and order. The
animation adds 272 accessors reading from a single extra bufferView. Everything else is a byte-level
copy of the mesh.

Balrog has 65 animations. At 65 separate files that is about 70 MB of GLTF for one NPC, of which
about 5 MB is unique. Merging the mesh once with 65 clips gives about 5.3 MB, a **92.5 percent**
reduction.

glTF supports this directly. The `animations` array holds any number of clips, each with its own
`name`. Three.js exposes them as `gltf.animations[]`, and `mixer.clipAction(gltf.animations[i])`
selects one. Nothing about their multi-mixer technique changes, since a clip is a clip regardless of
which file it arrived in.

### Do not merge everything for the player skeleton

`dummymale` has **1,995** animations and `dummyfemale` has 1,986. Those are the player skeletons, so
they are exactly what the dress-up feature needs. Merging all of them into one file gives roughly
131 MB in a single download, which is worse than the current on-demand fetch.

The right split:

- **NPCs:** merge all animations per NPC. Balrog at 65 clips and 5.3 MB is a clear improvement over
  65 requests and 70 MB.
- **Player skeleton:** merge a curated subset. The hunya simulator ships 12 poses total, listed in
  its `PO.csv`: `idle_a`, `fitting_idle_a`, `walk_a`, `run_a`, `pumpkin_idle_a`, `wedding_idle_a`,
  `frozen_idle_a`, `floriafairy_idle_a`, `emotion_dance_t`, `emotion_dance_v`, `down_idle_a`,
  `sit_chair_idle_a`. A dozen clips is a small file and covers the whole feature.

### How to merge

Two viable routes, neither investigated in depth:

1. **Post-process in `NifToGltf`.** The converter already rewrites GLTF JSON, has a `--repair-only`
   mode that walks an existing library, and already patches texture references across animation
   files. Adding a merge pass fits the existing shape: read the base GLTF, read each animation GLTF,
   append its `animations[0]` with `name` set to the animation id, append the sampler accessors and
   bufferViews with rebased indices, concatenate the `.bin`. The node arrays being identical in order
   is what makes the index rebasing safe.
2. **`gltf-transform` CLI.** The npm package has a documented merge and it handles buffer rebasing.
   Faster to prototype, adds a Node dependency to a C# pipeline.

Route 1 keeps the pipeline in one language and reuses code that already exists. Route 2 is quicker to
test the idea.

### Side benefit for the current site

This is worth doing even if the outfit simulator never ships. `ModelOnlyRenderer.svelte` currently
fires one HEAD request per animation to discover which exist, with a 5 second timeout each, then
`<model-viewer>` refetches the whole model when the user picks one. With merged files that becomes
one fetch, and the animation list comes from `gltf.animations.map(a => a.name)` rather than from
probing the CDN. For Balrog that removes 65 HEAD requests.

## Replacing Noesis

Worth doing, and more tractable than it sounds. Noesis is a closed-source binary driven by a
`ProcessStartInfo` per file, it forces the intermediate shape we are fighting in the section above,
and it is the reason bone names get lost. Owning the converter means owning the fix.

### The format is documented, not a black box

MS2 NIFs are `Gamebryo File Format, Version 30.2.0.3`, stated in plain ASCII in the first 38 bytes of
every file. This is a public format. The niftools `nif.xml` spec added 30.2.0.3 to its version list
along with `NiMesh` skinning block decoding, so the block layouts are written down.

The header is simple enough to parse without any library. Working Python, run against
`Character/female/f_body.nif`:

```python
d = open(path,'rb').read()
i = d.index(b'\n')+1                                    # version string line
off = i + 4 + 1 + 4                                     # version, endian, userVersion
nb  = struct.unpack_from('<I', d, off)[0]; off += 4     # numBlocks = 253
off += 4                                                # unknown u32, always 0 here
nbt = struct.unpack_from('<H', d, off)[0]; off += 2     # numBlockTypes = 18
types = []                                              # length-prefixed strings
for _ in range(nbt):
    ln = struct.unpack_from('<I', d, off)[0]; off += 4
    types.append(d[off:off+ln].decode()); off += ln
off += 2*nb + 4*nb                                      # block type index + block sizes
nstr = struct.unpack_from('<I', d, off)[0]; off += 4    # numStrings = 129
off += 4                                                # maxStringLength
# then nstr length-prefixed strings: 'Scene Root', 'Bip01', 'Bip01 Pelvis', ...
```

That reads the block table, the string table and the bone list correctly, and the block sizes sum to
the remaining file length as a checksum. The whole survey in the section above was produced with it.

Block types actually present in MS2 files, 18 in `f_body.nif`:

```
NiNode, NiMesh, NiSkinningMeshModifier, NiDataStream018, NiDataStream118, NiDataStream33,
NiSourceTexture, NiTexturingProperty, NiMaterialProperty, NiAlphaProperty, NiZBufferProperty,
NiVertexColorProperty, NiSpecularProperty, NiTransformController,
NiStringExtraData, NiColorExtraData, NiFloatExtraData, NiIntegerExtraData
```

Roughly 20 block types across the library, not the hundreds the full Gamebryo spec covers. `NiMesh`
plus `NiDataStream` is the newer Gamebryo geometry architecture where vertex attributes live in
separate stream blocks, and it is the part older tools handle worst. That is also why NifSkope and
Blender struggle with these files while Noesis works.

### Prior attempt, not worth chasing

`D:\Projetos\MapleStory2\NifExporterDebug\` holds `VulkanRayTracing.exe`, dated 5 October 2022, and
an `export/` directory with **11,375 FBX files** converted from MS2 NIFs. It is not Noesis. Strings
in the binary show:

- The project name `Nif-Converter`, from an embedded source path
  `Nif-Converter\VulkanRayTracing\Engine\VulkanGraphics\Core\FrameBuffer.cpp`.
- The literal `Gamebryo File Format, Version 30.2.0.3`, so it targets our exact version.
- Its own FBX writer, with `FBXHeaderExtension`, `FBXVersion` and `CreationTimeStamp` builders, not a
  linked SDK.
- 34 `Ni*` block type names, including `NiSkinningMeshModifier`, `NiTransformInterpolator`,
  `NiSequenceData` and `NiBSplineCompTransformEvaluator`, so it reads skinning and animation, not
  just static meshes.
- Log strings such as `found new mesh format in loaded package` and `exported '...'`.

No source is in that folder and no PDB path survived, and its origin is unknown to us. It is recorded
here only as evidence that a third-party MS2 NIF reader was written before, which confirms the format
is tractable. It writes FBX, which is the wrong target for us, and we have since reproduced the part
that mattered. Do not spend time tracking it down.

### The `NiDataStream` decode is solved

This was expected to be the hard part. It is not. Working from `f_body.nif` with no library and no
reference beyond the bytes, the geometry decoded in under an hour.

Every `NiDataStream` block has this layout:

```python
numBytes         u32
cloningBehavior  u32
numRegions       u32
regions          [numRegions] of (startIndex u32, numElements u32)
numComponents    u32
componentFormats [numComponents] u32
data             numBytes of raw vertex or index data
```

The component format u32 is self-describing. Byte 1 is the component count and byte 2 is the bytes
per component:

| Format | Meaning | Size |
|---|---|---|
| `0x00010215` | 1 x u16 | 2 |
| `0x00020436` | 2 x f32, UV | 8 |
| `0x00030437` | 3 x f32, position / normal / tangent / bitangent / weights | 12 |
| `0x00040108` | 4 x u8, bone indices | 4 |

Summing the component sizes gives the vertex stride, and it matches `numBytes / numElements` exactly.
For the main body mesh that is 466 vertices at a 72-byte stride across 7 components.

Decoded and validated on that mesh:

- **Positions**, X range -42.18 to 42.18, plausible MS2 character units.
- **Bone weights**, the last `f32x3` slot, which sums to 1.0 on 50 of 50 sampled vertices.
- **Bone indices**, the `u8x4` slot, values 0 to 19.
- **Indices**, 1,440 entries, so 480 triangles, with a maximum index of 465 against 466 vertices.
  In range and therefore valid.

The header parser also ran cleanly on **585 of 586** NIFs across `Item/`, `Character/` and a 200-file
sample of `Npc/`, so the format is consistent across the library rather than special-cased per asset.

That leaves no unknown blocking piece. Positions, normals, UVs, bone indices, bone weights and
triangles all come out of the file with plain struct reads.

### Realistic scope if we write our own

1. Header, block table, string table. **Done.** About 20 lines.
2. `NiDataStream` vertex and index decode. **Done.** About 30 lines.
3. `NiNode` tree with transforms, to rebuild the bone hierarchy. Tree walk over blocks we can already
   enumerate.
4. `NiSkinningMeshModifier` for the bone list and bind matrices. Same block-parsing shape as the
   rest.
5. `NiMesh` to tie a mesh to its streams and material. Mostly reference plumbing.
6. glTF writer. Well-specified, and we emit exactly the layout we want.
7. Animation, `NiTransformInterpolator` and `NiSequenceData` from the `.kf` files. Can ship later,
   since static meshes are useful on their own.

Steps 1 and 2 were the risk and both are cleared. What remains is bookkeeping over a format we can
already read.

Writing glTF directly rather than FBX is the whole point. We control the bone naming, so the
`Biped Object@#N` problem disappears. We can graft the skeleton onto rigid gear at export time. We
can merge animations at write time instead of post-processing someone else's output. Every workaround
in this document becomes an export setting.

### Is it worth it

Yes, and mostly because of what it removes rather than what it adds.

Against it: it is real work, roughly steps 3 to 6 above, and Noesis already converts these files
today.

For it: Noesis is a closed binary invoked once per file through `ProcessStartInfo`, so a bad export
cannot be debugged, only worked around. It is the direct cause of the `Biped Object@#N` renaming that
blocks this entire plan, and there is no way to fix that from outside the tool. Every other item in
this document, grafting skeletons onto hats, preserving bone names, merging animations, choosing which
textures to keep, is either trivial or impossible depending on whether we own the writer.

The library is also only about 20 block types, not the full Gamebryo surface, and we only need the
subset MS2 actually uses.

Recommendation: build it as a new repo of ours. Prove it by round-tripping `f_body.nif` to glTF and
loading the result in the Handbook viewer. Keep the Noesis path running until the new one matches, so
nothing regresses while it is being written. Do not chase `VulkanRayTracing.exe`. It is an unknown
2022 binary with no source, and we have already reproduced the part of it that mattered.

Note the DDS textures already sit beside the NIFs, for example
`Textures/item_clothes/11400001_f_basicsportweartop_c.dds`. The `_c` suffix is the dye control mask
the shading section needs, so it exists as a separate file and does not have to be recovered from an
embedded glTF texture. That answers one of the open questions in the data section.

## We do not need React for this

Three.js is a plain DOM library that takes a `<canvas>` and owns it. It does not care what framework
surrounds it. `ItemRenderer.svelte` already uses `onMount` plus an element reference, which is
exactly the shape three.js needs.

React would only help if we wanted React Three Fiber, and R3F is a poor fit here. The technique is
inherently imperative: an array of mixers, one clip broadcast to all of them, all stepped by one
delta every frame. That is a mutable object graph, and R3F would push us into `useRef` escape hatches
for all the interesting parts.

Svelte 5 runes fit well. `$state` for the equipped-item map, `$effect` to react when a slot changes,
and the three.js scene as a plain object held outside the reactive graph. Threlte exists if we want a
declarative layer later, and it is not needed to start.

A rewrite would cost 65 Svelte components plus SvelteKit routing, Prisma wiring and the Skeleton UI
kit, and buy the canvas nothing.

## What our data already has

`maple2_codex.items` is ahead of their CSV:

```sql
SELECT id, name, slot, is_outfit, dyeable, gender, kfms FROM items WHERE id = 11400001;
-- kfms: ["11400001_m_basicsportweartop", "11400001_f_basicsportweartop"]
```

Per-gender `kfms` as an array, plus `slot`, `is_outfit`, `dyeable` and `gender`. Their CSV has no
gender split at all. We do not need to build an item database, only query the one we have.

What we are missing is dye data. Their CSV carries `r1,g1,b1,r2,g2,b2` defaults per item. The control
mask texture is **not** missing: it ships beside the NIF as a `_c.dds`, for example
`Textures/item_clothes/11400001_f_basicsportweartop_c.dds`, alongside `_d` diffuse, `_n` normal and
`_s` specular. So the mask is available at conversion time and does not need recovering from an
embedded glTF texture. Still unchecked: whether our GLTFs currently keep `_c` as `_tex01`, and where
the default dye colours live in the game data.

We also have the player skeletons in the database already. `npcs` holds `dummymale` with 1,995
animations and `dummyfemale` with 1,986, listing every player animation name. Neither is on the CDN
yet, so both need converting. Their animation lists are the source for choosing which poses to ship.

## Suggested order

Everything before step 3 is backend work and lives in
[09-nif-to-gltf-converter.md](09-nif-to-gltf-converter.md). That plan owns the converter, the export
requirements and the batch regeneration.

1. **Build the converter and regenerate the models.** Plan 9. Nothing here starts until equipment
   comes out with a complete named `Bip01` tree.
2. **Prove the technique.** Load one converted hat and one top plus a motion clip, give each its own
   mixer, play one clip across all of them, confirm they stay locked together. If this fails, the
   feature stops here regardless of anything else.
3. **Point the Handbook at the new models.** Independent of the outfit feature and worth shipping on
   its own. `model-viewer` 4.3.1 already exposes `animationName` and `availableAnimations`, verified
   in its type definitions, so merged multi-animation GLTFs work in the existing viewer.
   `ModelOnlyRenderer.svelte` reads the animation list from `availableAnimations` instead of firing
   one HEAD request per animation. For Balrog that removes 65 requests.
4. **Build the outfit renderer** as a new Svelte component alongside `ItemRenderer.svelte`. Do not
   modify the existing one; single-item and NPC views keep working on `<model-viewer>`, which cannot
   expose the per-slot mixers this needs. Copy the light values from the shading section verbatim.
5. **Add dyeing.** The `_c` control mask ships as a separate DDS beside every NIF, so the input
   exists. Still unknown: where the default dye colours live in the game data.
6. **Add poses, expressions and backgrounds** last. These are pure additions once mixers work.

Step 2 is the risk on this side. Everything after it is ordinary work.

The player skeleton is a dependency worth naming early. `dummymale` and `dummyfemale` have 1,995 and
1,986 animations listed in `npcs`, but `Maple2Storage/Resources/Models/Character/` holds only
`f_body.nif` and `m_body.nif`. The `.kfm` files reference `.\Dummy.nif` plus separate `.kf` clips, so
the animation set is assembled rather than stored in one model. Resolve this during plan 9, because
there is no base body to dress without it.

## Files

- **Backend:** all converter work is in [09-nif-to-gltf-converter.md](09-nif-to-gltf-converter.md)
- **New:** `src/lib/components/OutfitSimulator.svelte` (three.js canvas, mixer array, equip logic)
- **New:** `src/routes/dressroom/+page.svelte`
- **New:** `src/routes/api/dressroom/+server.ts` (slot-filtered item search from `items`)
- **Modify (independent):** `src/lib/components/ModelOnlyRenderer.svelte` (read the animation list
  from merged `gltf.animations` instead of probing the CDN with one HEAD per animation)
- **Unchanged:** `src/lib/components/item/ItemRenderer.svelte`

## Legal note

The hunya author states in the site FAQ that they received a Nexon game-IP usage guide through a 1:1
inquiry. That guide has not been read, so its terms are unknown. Their R2 bucket holds ripped client
assets and disables listing. Do not hotlink it. Anything we ship must come from our own conversion
pipeline and our own CDN.
