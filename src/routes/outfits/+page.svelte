<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { parseNativeManifest, type NativeAsset } from '$lib/nativeAssets';
  import {
    libraryBase,
    characterPreviewBase,
    slotNames,
    resolveBundle,
    bundleKey,
    type CatalogItem,
    type OutfitBundle
  } from '$lib/outfits/catalog';
  import { getImageUrl } from '$lib/getImageUrl';
  import type { OutfitScene } from '$lib/outfits/OutfitScene';
  import type { ColorControl, Rgb } from '$lib/outfits/materialColors';
  import { customizationSchema, type Customization } from '$lib/outfits/faceAnimation';
  import { characterPreviewSchema } from '$lib/outfits/characterPreview';
  import { loadSassyPreview } from '$lib/outfits/sassyPreview';
  let assetBase = $state(libraryBase);
  let preview = $state('');
  let hairPreview = $state('');
  let previewName = $state('');
  let omitted = $state<string[]>([]);
  let previewNotes = $state<string[]>([]);
  let customization = $state<Customization>();
  let expression = $state('default');
  let background = $state('');
  async function chooseBackground(value: string) {
    try {
      await viewer?.setBackground(value ? `${assetBase}backgrounds/bg/bg_${value}.png` : null);
      background = value;
    } catch {
      error = 'Unable to load this background. Your previous background is still selected.';
    }
  }
  let container: HTMLDivElement;
  let viewer: OutfitScene | undefined;
  let assets = $state<NativeAsset[]>([]);
  let body = $state('female');
  let clips = $state<string[]>([]);
  let clip = $state('');
  let playing = $state(false);
  let busy = $state(true);
  let error = $state('');
  let hatWarnings = $state<string[]>([]);
  let equipped = $state<OutfitBundle[]>([]);
  const expressionOptions = $derived(
    Object.keys(
      customization?.faces[
        String(
          equipped.find((b) => b.slots.includes('FA'))?.item.id ??
            (body === 'male' ? 10300001 : 10300003)
        )
      ]?.sequences ?? {}
    )
  );
  const drawnStars = $derived(
    equipped.some((bundle) => bundle.item.id === 13400306 && bundle.weaponPlacement !== 'stowed')
  );
  const weapons = $derived(equipped.filter((bundle) => bundle.weaponForms));
  async function placeWeapons(placement: 'drawn' | 'stowed') {
    busy = true;
    error = '';
    try {
      await viewer?.setWeaponPlacement(placement);
      refresh();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to move weapons';
    } finally {
      busy = false;
    }
  }
  // Viewer controls mutate their color arrays outside Svelte. Keep them raw so a
  // colorRevision rerender reads the viewer's current values instead of stale proxies.
  let colors = $state.raw<ColorControl[]>([]);
  let hairControls = $state<OutfitScene['hairControls']>([]);
  let hairPlacements = $state.raw<OutfitScene['hairPlacementControls']>([]);
  let placementRevision = $state(0);
  let equipmentAnimations = $state<OutfitScene['equipmentAnimationControls']>([]);
  let makeupControls = $state<OutfitScene['makeupControls']>();
  let colorRevision = $state(0);
  let search = $state('');
  let slot = $state('');
  let availability = $state('all');
  let outfit = $state('all');
  let page = $state(0);
  let items = $state<CatalogItem[]>([]);
  let total = $state(0);
  let loadingCatalog = $state(true);
  let catalogError = $state('');
  let ready = $state(false);
  let effectsEnabled = $state(true);
  const hasHairEffect = $derived(equipped.some((bundle) => bundle.item.library?.cosmeticEffect));
  let retry = $state(0);
  const limit = 12;
  const hex = (color: Rgb) =>
    '#' +
    color
      .map((v) =>
        Math.round(Math.max(0, Math.min(1, v)) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('');
  function recolor(control: ColorControl, index: number, value: string) {
    control.set(
      index,
      [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255) as Rgb
    );
    colorRevision++;
  }
  function refresh() {
    if (viewer) {
      equipped = viewer.equippedItems;
      hatWarnings = viewer.hatAttachmentWarnings;
      colors = viewer.colorControls;
      hairControls = viewer.hairControls;
      hairPlacements = viewer.hairPlacementControls;
      equipmentAnimations = viewer.equipmentAnimationControls;
      makeupControls = viewer.makeupControls;
      expression = 'default';
      viewer.selectExpression(expression);
    }
  }
  async function chooseBody(variant: string) {
    const asset = assets.find((entry) => entry.bodyVariant === variant && !entry.skeleton);
    if (!asset || !viewer) return;
    busy = true;
    error = '';
    try {
      clips = await viewer.setBody(asset);
      body = variant;
      page = 0;
      refresh();
      clip = clips.includes('fitting_idle_a') ? 'fitting_idle_a' : clips[0];
      viewer.selectClip(clip);
      playing = true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to load body';
    } finally {
      busy = false;
    }
  }
  async function equip(item: CatalogItem, hand?: 'LH' | 'RH') {
    if (!viewer) return;
    busy = true;
    error = '';
    try {
      await viewer.equipBundle(resolveBundle(item, assets, body, hand));
      refresh();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to equip item';
    } finally {
      busy = false;
    }
  }
  function download() {
    if (!viewer) return;
    const link = document.createElement('a');
    link.href = viewer.screenshot();
    link.download = 'maplestory2-outfit.png';
    link.click();
  }
  $effect(() => {
    const query = new URLSearchParams({
      preview,
      hairPreview,
      search,
      slot,
      availability,
      outfit,
      body,
      page: String(page),
      limit: String(limit)
    });
    void retry;
    if (!ready) return;
    const abort = new AbortController();
    loadingCatalog = true;
    catalogError = '';
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/outfits?${query}`, { signal: abort.signal });
          if (!response.ok) throw new Error('Unable to load the clothing catalog.');
          const result: { items: CatalogItem[]; total: number } = await response.json();
          if (!abort.signal.aborted) {
            items = result.items;
            total = result.total;
          }
        } catch (cause) {
          if (!abort.signal.aborted) {
            items = [];
            catalogError = cause instanceof Error ? cause.message : 'Catalog unavailable';
          }
        } finally {
          if (!abort.signal.aborted) loadingCatalog = false;
        }
      })();
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  });
  onMount(() => {
    let active = true;
    void (async () => {
      try {
        preview = dev ? (new URLSearchParams(location.search).get('preview') ?? '') : '';
        hairPreview = dev ? (new URLSearchParams(location.search).get('hairPreview') ?? '') : '';
        if (hairPreview && (hairPreview !== 'sassy' || preview))
          throw new Error('Invalid local hair preview');
        if (preview) assetBase = characterPreviewBase(preview);
        const url = new URL(`${assetBase}native-manifest.json`, location.href).href;
        const [{ OutfitScene }, response] = await Promise.all([
          import('$lib/outfits/OutfitScene'),
          fetch(url)
        ]);
        if (!response.ok) throw new Error('The outfit model library is unavailable.');
        const manifest = parseNativeManifest(await response.json(), url);
        if (!active) return;
        const customResponse = await fetch(`${assetBase}customization.json`);
        if (!customResponse.ok) throw new Error('Customization library is unavailable');
        customization = customizationSchema.parse(await customResponse.json());
        if (!active) return;
        assets = hairPreview
          ? [...manifest, ...(await loadSassyPreview(fetch, location.href))]
          : manifest;
        viewer = new OutfitScene(container);
        viewer.setCustomization(customization, assetBase);
        if (dev) Object.assign(container, { outfitViewer: viewer });
        await chooseBody(body);
        if (preview) {
          busy = true;
          const response = await fetch(`${assetBase}character.json`);
          if (!response.ok) throw new Error('Character preview is unavailable');
          const character = characterPreviewSchema.parse(await response.json());
          if (!active) return;
          if (body !== character.body) await chooseBody(character.body);
          busy = true;
          previewName = character.name;
          omitted = [...character.omitted];
          previewNotes = character.notes;
          viewer.colorControls.find((c) => c.label === 'Skin')?.setColors(character.skin);
          for (const saved of character.items) {
            try {
              const query = new URLSearchParams({
                preview,
                body,
                availability: 'preview',
                search: String(saved.id)
              });
              const result = await fetch(`/api/outfits?${query}`);
              if (!result.ok) throw new Error('Catalog lookup failed');
              const data: { items: CatalogItem[] } = await result.json();
              const item = data.items.find((i) => i.id === saved.id);
              if (!item) throw new Error('Exact item is unavailable');
              if (!active) return;
              const bundle = resolveBundle(item, assets, body, saved.hand);
              await viewer.equipBundle(bundle);
              if (saved.colors) viewer.setItemColors(bundleKey(bundle), saved.colors);
              if (saved.hairLengths && bundle.slots.includes('HR'))
                viewer.setHairLengths(saved.hairLengths);
            } catch (cause) {
              omitted.push(
                `${saved.id}: ${cause instanceof Error ? cause.message : 'Unable to load item'}`
              );
            }
          }
          refresh();
          availability = 'preview';
        }
        ready = true;
      } catch (cause) {
        error = cause instanceof Error ? cause.message : 'Unable to open outfit viewer';
      } finally {
        busy = false;
      }
    })();
    return () => {
      active = false;
      viewer?.destroy();
    };
  });
</script>

<svelte:head><title>Outfits | MapleStory 2 Handbook</title></svelte:head>
<main class="mx-auto max-w-7xl p-4">
  <h1 class="mb-2 text-2xl font-bold">Outfits</h1>
  {#if previewName}<p class="mb-2">Loaded {previewName}'s saved appearance.</p>{/if}
  {#each previewNotes as note}<p class="mb-2 text-sm opacity-75">{note}</p>{/each}
  {#if drawnStars && clip === 'emotion_dance_t'}<p role="status" class="mb-2 text-sm">
      Dance T intersects the drawn stars with the face. Use star attack idle for weapon review.
    </p>{/if}
  {#if weapons.some((bundle) => bundle.weaponPlacement === 'stowed')}
    <p role="status" class="mb-2 text-sm">
      Back placement uses the item's source anchor. Two stars overlap there; paired placement has
      not been matched to the client.
    </p>
  {/if}
  {#if omitted.length}<aside
      class="mb-4 rounded border border-amber-600 p-3"
      aria-label="Character preview limitations"
    >
      <p>Not displayed:</p>
      <ul class="list-inside list-disc">
        {#each omitted as reason}<li>{reason}</li>{/each}
      </ul>
    </aside>{/if}
  <p class="mb-4 text-sm opacity-75">
    Dress your character, customize colors and save an image. The catalog includes every eligible
    client item. Preview models may have appearance issues; unavailable items show the reason.
  </p>
  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
    <section class="min-w-0" aria-label="Character">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <label
          >Body <select
            disabled={busy}
            value={body}
            onchange={(e) => chooseBody(e.currentTarget.value)}
            ><option value="female">Female</option><option value="male">Male</option></select
          ></label
        >
        <label
          >Pose <select
            disabled={busy}
            bind:value={clip}
            onchange={() => {
              viewer?.selectClip(clip);
              playing = true;
            }}
            >{#each clips as name}<option value={name}>{name.replaceAll('_', ' ')}</option
              >{/each}</select
          ></label
        >
        <button
          disabled={busy || !clip}
          onclick={() => {
            playing = !playing;
            if (viewer) viewer.playing = playing;
          }}>{playing ? 'Pause' : 'Play'}</button
        >
        <button disabled={busy || !ready} onclick={download}>Save image</button>
        {#if hasHairEffect}
          <label
            ><input
              type="checkbox"
              checked={effectsEnabled}
              onchange={(e) => {
                effectsEnabled = e.currentTarget.checked;
                viewer?.setEffectsEnabled(effectsEnabled);
              }}
            /> Hair effects</label
          >
        {/if}
        {#if weapons.length}
          <button
            disabled={busy || weapons.every((bundle) => bundle.weaponPlacement === 'drawn')}
            onclick={() => placeWeapons('drawn')}>Draw weapons</button
          >
          <button
            disabled={busy || weapons.every((bundle) => bundle.weaponPlacement === 'stowed')}
            onclick={() => placeWeapons('stowed')}>Stow weapons</button
          >
        {/if}
        {#each equipmentAnimations as control}
          <label
            >{control.label}<select
              value={control.current}
              disabled={busy}
              onchange={(event) => {
                control.set(event.currentTarget.value);
                refresh();
              }}
            >
              {#each control.names as name}<option value={name}>{name}</option>{/each}
            </select></label
          >
        {/each}
        <label
          >Expression <select
            disabled={busy}
            bind:value={expression}
            onchange={() => viewer?.selectExpression(expression)}
            >{#each expressionOptions as name}<option value={name}
                >{name === 'default' ? 'Blink' : name[0].toUpperCase() + name.slice(1)}</option
              >{/each}</select
          ></label
        >
        <label
          >Background <select
            value={background}
            onchange={(e) => chooseBackground(e.currentTarget.value)}
            ><option value="">Studio</option><option value="blue">Blue sky</option><option
              value="henesys_a">Henesys</option
            ><option value="ellinia_a">Ellinia</option></select
          ></label
        >
        {#each ['front', 'side', 'back'] as angle}<button
            disabled={busy}
            onclick={() => viewer?.view(angle as 'front' | 'side' | 'back')}
            >{angle[0].toUpperCase() + angle.slice(1)}</button
          >{/each}
      </div>
      {#if error}<p role="alert" class="mb-3 text-red-400">{error}</p>{/if}
      {#each hatWarnings as warning}<p role="status" class="mb-3 text-amber-300">
          {warning}
        </p>{/each}
      {#if hasHairEffect}<p class="mb-2 text-sm opacity-75">
          Hair effect preview: sparkle motion and glow may differ from the game.
        </p>{/if}
      <div
        bind:this={container}
        class="h-[min(65vh,650px)] min-h-[350px] w-full overflow-hidden rounded-xl"
        aria-label="Outfit preview"
      ></div>
      <p role="status" class="mt-2 text-sm">
        {busy ? 'Loading character…' : 'Drag to rotate. Scroll to zoom.'}
      </p>
      <h2 class="mt-4 font-bold">Equipped</h2>
      {#key placementRevision}{#each hairPlacements as control}
          <label
            >{control.label}
            <select
              value={control.value}
              disabled={busy}
              onchange={(event) => {
                control.set(Number(event.currentTarget.value));
                placementRevision++;
              }}
            >
              {#each control.values as value}<option {value}>Position {value + 1}</option>{/each}
            </select>
          </label>
          <button
            disabled={busy}
            onclick={() => {
              control.reset();
              placementRevision++;
            }}>Reset {control.label}</button
          >
        {/each}{/key}
      {#each hairControls as control}<label
          >{control.label}
          {#if control.range}
            <span class="tabular-nums">{Number(control.value.toFixed(4))}</span>
            <input
              type="range"
              min={control.range.min}
              max={control.range.max}
              step="0.01"
              value={control.value}
              disabled={busy}
              oninput={(event) => {
                control.set(event.currentTarget.valueAsNumber);
                hairControls = viewer?.hairControls ?? [];
              }}
            />
          {:else}
            <select
              value={control.value}
              disabled={busy}
              onchange={(e) => {
                control.set(Number(e.currentTarget.value));
                hairControls = viewer?.hairControls ?? [];
              }}
              ><option value={control.value} disabled>Current: {control.value}</option
              >{#each control.values as value}<option {value}>{value}</option>{/each}</select
            >
          {/if}</label
        >
        <button
          aria-label={`Reset ${control.label}`}
          onclick={() => {
            control.reset();
            hairControls = viewer?.hairControls ?? [];
          }}>Reset length</button
        >
      {/each}
      {#if makeupControls}
        <div class="flex flex-wrap items-center gap-2">
          <label
            >Makeup placement <select
              disabled={busy}
              onchange={(event) => {
                makeupControls?.place(Number(event.currentTarget.value));
                makeupControls = viewer?.makeupControls;
              }}
              >{#each makeupControls.placements as _, index}<option value={index}
                  >Position {index + 1}</option
                >{/each}</select
            ></label
          >
          {#if makeupControls.scaleRange[0] !== makeupControls.scaleRange[1]}
            <label
              >Makeup size <input
                type="range"
                min={makeupControls.scaleRange[0]}
                max={makeupControls.scaleRange[1]}
                step="0.001"
                value={makeupControls.value[3]}
                oninput={(event) => {
                  makeupControls?.scale(Number(event.currentTarget.value));
                  makeupControls = viewer?.makeupControls;
                }}
              /></label
            >
          {/if}
          <button
            onclick={() => {
              makeupControls?.reset();
              makeupControls = viewer?.makeupControls;
            }}>Reset makeup</button
          >
        </div>
      {/if}
      {#if !equipped.length}<p class="text-sm opacity-70">Choose clothing from the catalog.</p>{/if}
      <div class="mt-2 flex flex-wrap gap-2">
        {#each equipped as bundle (bundleKey(bundle))}<button
            disabled={busy}
            aria-label={`Remove ${bundle.item.name}${bundle.hand ? ' from ' + (bundle.hand === 'LH' ? 'left' : 'right') + ' hand' : ''}`}
            onclick={async () => {
              busy = true;
              try {
                await viewer?.removeItem(bundleKey(bundle));
                refresh();
              } catch (cause) {
                error = cause instanceof Error ? cause.message : 'Unable to remove item';
              } finally {
                busy = false;
              }
            }}
            >{bundle.item.name}{bundle.hand
              ? ' • ' + (bundle.hand === 'LH' ? 'Left' : 'Right')
              : ''} ×</button
          >{/each}
      </div>
      {#if colors.length}<details class="mt-4 rounded border p-3">
          <summary>Colors</summary>
          {#key colorRevision}{#each colors as control}
              {@const palette =
                customization?.palettes[
                  control.paletteId ??
                    (control.shader === 'Face'
                      ? '3'
                      : control.label === 'Skin'
                        ? '1'
                        : control.shader.includes('Hair')
                          ? '2'
                          : '10')
                ] ?? []}
              <fieldset class="mt-3 flex flex-wrap items-center gap-3">
                <legend>{control.label}</legend>
                <label
                  >Game palette <select
                    aria-label={`${control.label} palette`}
                    onchange={(e) => {
                      const choice = palette.find((p) => p.id === e.currentTarget.value);
                      if (choice) {
                        control.setColors(choice.colors);
                        colorRevision++;
                      }
                    }}
                    ><option value="">Choose color</option>{#each palette as choice}<option
                        value={choice.id}>{choice.swatch}</option
                      >{/each}</select
                  ></label
                >
                {#each control.colors as color, index}<label
                    >{['Primary', 'Accent', 'Shade'][index]}
                    <input
                      type="color"
                      value={hex(color)}
                      disabled={busy}
                      onchange={(e) => recolor(control, index, e.currentTarget.value)}
                    /></label
                  >{/each}
                <button
                  disabled={busy}
                  onclick={() => {
                    control.reset();
                    colorRevision++;
                  }}>Reset colors</button
                >
              </fieldset>{/each}{/key}
        </details>{/if}
    </section>
    <section aria-label="Clothing catalog" class="min-w-0 rounded-xl border border-slate-600 p-3">
      <h2 class="mb-3 text-lg font-bold">Clothing catalog</h2>
      <label class="block"
        >Search name or item ID<input
          class="mt-1 w-full"
          type="search"
          placeholder="e.g. hoodie or 11400350"
          bind:value={search}
          oninput={() => (page = 0)}
        /></label
      >
      <div class="my-3 flex flex-wrap gap-2">
        <label
          >Slot <select bind:value={slot} onchange={() => (page = 0)}
            ><option value="">All slots</option><option value="full">Full outfits</option
            >{#each Object.entries(slotNames) as [key, name]}<option value={key}>{name}</option
              >{/each}</select
          ></label
        >
        <label
          >Show <select bind:value={availability} onchange={() => (page = 0)}
            ><option value="preview">Available models</option><option value="verified"
              >Verified models</option
            ><option value="all">All items</option></select
          ></label
        >
        <label
          >Type <select bind:value={outfit} onchange={() => (page = 0)}
            ><option value="all">All clothing</option><option value="true">Outfits</option><option
              value="false">Equipment</option
            ></select
          ></label
        >
      </div>
      {#if loadingCatalog}<p role="status">Searching…</p>
      {:else if catalogError}<p role="alert">{catalogError}</p>
        <button onclick={() => retry++}>Retry</button>
      {:else}
        <p class="mb-2 text-sm opacity-75">{total} items for the {body} body</p>
        {#if !items.length}<p>No clothing matches these filters.</p>{/if}
        <div class="grid grid-cols-2 gap-2">
          {#each items as item (item.id)}{@const available =
              item.library && item.library.availability !== 'unavailable'}
            <div class="flex flex-col gap-1">
              <button
                class="flex min-h-32 flex-col items-start gap-1 text-left"
                disabled={busy || !available}
                title={item.library?.reason ?? 'No model in this library'}
                onclick={() => equip(item)}
                aria-label={`Equip ${item.name}${item.library?.handParts ? ' in right hand' : ''}`}
              >
                {#if item.icon_path && !item.icon_path.toLowerCase().endsWith('icon0.png')}<img
                    src={dev
                      ? item.icon_path.replace('./data/', '/')
                      : getImageUrl(item.icon_path.replace('./data/', '/'))}
                    alt=""
                    class="h-10 w-10 object-contain"
                    onerror={(event) => {
                      if (event.currentTarget instanceof HTMLImageElement) {
                        event.currentTarget.hidden = true;
                        event.currentTarget.nextElementSibling?.removeAttribute('hidden');
                      }
                    }}
                  /><span hidden class="text-xs" aria-label="No item icon">?</span>
                {:else}<span
                    class="flex h-10 w-10 items-center justify-center rounded bg-surface-500/20 text-xs"
                    aria-label="No item icon">?</span
                  >{/if}
                <span class="text-sm font-semibold">{item.name}</span><span
                  class="text-xs opacity-70">{item.id}</span
                ><span class="text-xs"
                  >{available
                    ? item.library?.availability === 'verified'
                      ? 'Verified'
                      : 'Preview'
                    : 'Unavailable'}</span
                >
                {#if !available}<span class="text-xs">{item.library?.reason}</span>{/if}
                {#each item.library?.limitations ?? [] as limitation}<span class="text-xs"
                    >{limitation}</span
                  >{/each}
                {#if item.library?.handParts}<span class="text-xs">Equip right hand</span>{/if}
              </button>
              {#if item.library?.handParts}<button
                  disabled={busy || !available}
                  onclick={() => equip(item, 'LH')}
                  aria-label={`Equip ${item.name} in left hand`}>Equip left hand</button
                >{/if}
            </div>
          {/each}
        </div>
        <nav aria-label="Catalog pages" class="mt-3 flex items-center justify-between gap-2">
          <button disabled={page === 0} onclick={() => page--}>Previous</button><span
            >{page + 1} / {Math.max(1, Math.ceil(total / limit))}</span
          ><button disabled={(page + 1) * limit >= total} onclick={() => page++}>Next</button>
        </nav>
      {/if}
    </section>
  </div>
</main>

<style>
  select,
  input[type='search'] {
    border-radius: 0.375rem;
    background: #1e293b;
    color: white;
    padding: 0.45rem;
    border: 1px solid #64748b;
  }
  button {
    border: 1px solid #64748b;
    border-radius: 0.375rem;
    padding: 0.45rem 0.6rem;
  }
  button:enabled:hover {
    background: #334155;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
