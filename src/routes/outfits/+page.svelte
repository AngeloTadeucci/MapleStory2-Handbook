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
  import { loadHairPreviews } from '$lib/outfits/hairPreviews';
  import { animationGroups, animationLabel } from '$lib/outfits/characterAnimations';
  import ColorPanel from '$lib/outfits/ColorPanel.svelte';
  import SlotIcon from '$lib/outfits/SlotIcon.svelte';
  import {
    decodeOutfit,
    encodeOutfit,
    resolveOutfit,
    MAX_CODE_LENGTH,
    type OutfitCode
  } from '$lib/outfits/outfitCode';
  import {
    Camera,
    Copy,
    Download,
    Upload,
    RotateCcw,
    Check,
    X,
    ChevronLeft,
    ChevronRight
  } from 'lucide-svelte';
  let assetBase = $state(libraryBase);
  let preview = $state('');
  let hairPreview = $state('');
  let browserHairEnabled = $state(false);
  function toggleBrowserHair(enabled: boolean) {
    browserHairEnabled = enabled;
    viewer?.setBrowserHairEnabled(enabled);
  }
  let previewName = $state('');
  let omitted = $state<string[]>([]);
  let previewNotes = $state<string[]>([]);
  let customization = $state<Customization>();
  let expression = $state('auto');
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
  // Color panels read the viewer's current values instead of stale proxies.
  let colors = $state.raw<ColorControl[]>([]);
  let hairControls = $state<OutfitScene['hairControls']>([]);
  let hairPlacements = $state.raw<OutfitScene['hairPlacementControls']>([]);
  let placementRevision = $state(0);
  let equipmentAnimations = $state<OutfitScene['equipmentAnimationControls']>([]);
  let makeupControls = $state.raw<OutfitScene['makeupControls']>();
  let moving = $state<'makeup' | number | null>(null);
  let dragStart: { pointer: number; x: number; position: number } | undefined;
  function beginMove(target: 'makeup' | number) {
    moving = target;
    customizeOpen = true;
    playing = false;
    if (viewer) {
      viewer.playing = false;
      viewer.view('front');
    }
  }
  function movePointer(event: PointerEvent) {
    if (!dragStart || dragStart.pointer !== event.pointerId || !viewer || busy) return;
    if (moving === 'makeup') {
      const point = viewer.makeupPoint(event.clientX, event.clientY);
      if (point) {
        makeupControls?.move(...point);
        makeupControls = viewer.makeupControls;
      }
    } else if (moving !== null) {
      const control = hairPlacements[moving];
      if (!control) return;
      control.set(
        Math.max(
          0,
          Math.min(
            control.values.length - 1,
            dragStart.position + (event.clientX - dragStart.x) / 120
          )
        )
      );
      placementRevision++;
    }
  }
  function hairPosition(index: number) {
    void placementRevision;
    return hairPlacements[index].value;
  }
  function moveKey(event: KeyboardEvent) {
    const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (!direction || moving === null || busy) return;
    event.preventDefault();
    if (moving === 'makeup' && makeupControls) {
      const [x, y] = makeupControls.value;
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
      makeupControls.move(
        Math.max(-0.5, Math.min(0.5, x + (horizontal ? direction * 0.002 : 0))),
        Math.max(-0.5, Math.min(0.5, y + (horizontal ? 0 : direction * 0.002)))
      );
      makeupControls = viewer?.makeupControls;
    } else if (typeof moving === 'number') {
      const control = hairPlacements[moving];
      control.set(
        Math.max(0, Math.min(control.values.length - 1, control.value + direction * 0.02))
      );
      placementRevision++;
    }
  }
  let search = $state('');
  let slot = $state('HR');
  let customizeOpen = $state(false);
  const availability = 'preview';
  const outfit = 'all';
  let page = $state(0);
  let items = $state<CatalogItem[]>([]);
  let total = $state(0);
  let loadingCatalog = $state(true);
  let catalogError = $state('');
  let ready = $state(false);
  let mounted = false;
  let effectsEnabled = $state(true);
  const hasHairEffect = $derived(equipped.some((bundle) => bundle.item.library?.cosmeticEffect));
  let retry = $state(0);
  let limit = $state(12);
  function refresh() {
    moving = null;
    if (viewer) {
      equipped = viewer.equippedItems;
      hatWarnings = viewer.hatAttachmentWarnings;
      colors = viewer.colorControls;
      hairControls = viewer.hairControls;
      hairPlacements = viewer.hairPlacementControls;
      equipmentAnimations = viewer.equipmentAnimationControls;
      makeupControls = viewer.makeupControls;
      if (expression !== 'auto' && !expressionOptions.includes(expression)) expression = 'auto';
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
      expression = 'auto';
      refresh();
      clip = clips.includes('fitting_idle_a') ? 'fitting_idle_a' : clips[0];
      viewer.selectClip(clip);
      playing = true;
      viewer.view();
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
      viewer.view();
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
    const desktop = window.matchMedia('(min-width: 851px)');
    const updatePageSize = () => {
      limit = desktop.matches ? 30 : 12;
      page = 0;
    };
    updatePageSize();
    desktop.addEventListener('change', updatePageSize);
    return () => desktop.removeEventListener('change', updatePageSize);
  });
  onMount(() => {
    mounted = true;
    let active = true;
    void (async () => {
      try {
        preview = dev ? (new URLSearchParams(location.search).get('preview') ?? '') : '';
        hairPreview = dev ? (new URLSearchParams(location.search).get('hairPreview') ?? '') : '';
        if (hairPreview && (!['sassy', 'twins'].includes(hairPreview) || preview))
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
        assets = preview
          ? manifest
          : [...manifest, ...(await loadHairPreviews(fetch, location.href))];
        viewer = new OutfitScene(container);
        viewer.setCustomization(customization, assetBase);
        await viewer.setBackground(null);
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
      mounted = false;
      viewer?.destroy();
    };
  });

  const leftSlots = ['CP', 'EY', 'CL', 'PA', 'MT', 'RH'];
  const rightSlots = ['EA', 'FH', 'GL', 'SH', 'LH'];
  const selected = $derived(equipped.find((b) => occupies(b, slot)));
  const selectedColors = $derived.by(() => {
    void colors;
    return selected ? (viewer?.itemColorControls(bundleKey(selected)) ?? []) : [];
  });
  function occupies(bundle: OutfitBundle, target: string) {
    return (
      bundle.slots.includes(target) ||
      (['LH', 'RH'].includes(target) && bundle.slots.some((s) => ['BH', 'RHLH'].includes(s)))
    );
  }
  function selectSlot(value: string) {
    moving = null;
    customizeOpen = false;
    slot = value;
    search = '';
    page = 0;
  }
  function iconUrl(path: string) {
    return dev ? path.replace('./data/', '/') : getImageUrl(path.replace('./data/', '/'));
  }
  async function removeItem(item: OutfitBundle) {
    if (!viewer || busy) return;
    moving = null;
    busy = true;
    error = '';
    try {
      await viewer.removeItem(bundleKey(item));
      refresh();
      viewer.view();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to remove item';
    } finally {
      busy = false;
    }
  }
  async function clearOutfit() {
    await chooseBody(body);
  }
  let sharing = $state(false);
  let outfitText = $state('');
  let shareMessage = $state('');
  let shareError = $state('');
  function captureOutfit(): OutfitCode {
    if (!viewer) throw new Error('Wait for the character to load.');
    if (preview)
      throw new Error(
        'Sharing is available in the public wardrobe. Private character previews cannot be exported.'
      );
    return {
      version: 1,
      body: body as 'female' | 'male',
      bodyColors: viewer.bodyColorControls.map((c) => c.colors.map((v): Rgb => [...v])),
      items: viewer.equippedItems.map((b) => {
        const makeup = b.slots.includes('FD') ? viewer?.makeupControls : undefined;
        const position = makeup?.placements.findIndex((p) =>
          p.slice(0, 3).every((v, i) => v === makeup.value[i])
        );
        return {
          id: b.item.id,
          hand: b.hand,
          placement: b.weaponPlacement,
          colors: viewer!
            .itemColorControls(bundleKey(b))
            .map((c) => c.colors.map((v): Rgb => [...v])),
          ...(b.slots.includes('HR') ? { hair: viewer!.savedHairState } : {}),
          ...(makeup
            ? {
                makeup: {
                  position: Math.max(0, position ?? 0),
                  scale: makeup.value[3],
                  ...(makeup.movable
                    ? { offset: [makeup.value[0], makeup.value[1]] as [number, number] }
                    : {}),
                  ...(makeup.rotatable ? { rotation: makeup.value[2] } : {})
                }
              }
            : {}),
          animations: viewer!.equipmentAnimationControls
            .filter((c) => c.key === bundleKey(b))
            .map((c) => c.current)
        };
      }),
      expression,
      background: background as OutfitCode['background'],
      pose: clip,
      playing,
      effects: effectsEnabled,
      browserMotion: browserHairEnabled
    };
  }
  function exportCode() {
    shareError = '';
    shareMessage = '';
    try {
      outfitText = encodeOutfit(captureOutfit());
      shareMessage = 'Outfit code ready. Copy it or save it as text.';
    } catch (cause) {
      shareError = cause instanceof Error ? cause.message : 'Unable to export outfit';
    }
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(outfitText);
      shareMessage = 'Copied outfit code.';
    } catch {
      shareMessage = 'Clipboard unavailable. Select and copy the code below.';
    }
  }
  function saveCode() {
    const url = URL.createObjectURL(new Blob([outfitText], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maplestory2-outfit.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importCode() {
    if (!viewer || !customization || busy) return;
    shareError = '';
    shareMessage = '';
    busy = true;
    let staged: OutfitScene | undefined;
    let host: HTMLDivElement | undefined;
    try {
      if (preview) throw new Error('Open the public wardrobe to import an outfit.');
      const code = decodeOutfit(outfitText);
      const catalog: CatalogItem[] = [];
      for (const id of new Set(code.items.map((i) => i.id))) {
        const response = await fetch(
          `/api/outfits?body=${code.body}&search=${id}&availability=all`
        );
        if (!response.ok)
          throw new Error('Unable to validate the catalog. Your current outfit is unchanged.');
        const result: { items: CatalogItem[] } = await response.json();
        catalog.push(...result.items);
      }
      const bundles = resolveOutfit(code, catalog, assets);
      const bodyAsset = assets.find((a) => a.bodyVariant === code.body && !a.skeleton);
      if (!bodyAsset) throw new Error('This body is unavailable.');
      const faceId =
        bundles.find((b) => b.slots.includes('FA'))?.item.id ??
        (code.body === 'male' ? 10300001 : 10300003);
      if (
        code.expression !== 'auto' &&
        !customization.faces[String(faceId)]?.sequences[code.expression]
      )
        throw new Error('This expression is unavailable for the selected face.');
      host = document.createElement('div');
      host.style.cssText = `position:fixed;left:-10000px;top:0;width:${container.clientWidth}px;height:${container.clientHeight}px;`;
      document.body.appendChild(host);
      const { OutfitScene } = await import('$lib/outfits/OutfitScene');
      staged = new OutfitScene(host);
      staged.setCustomization(customization, assetBase);
      const nextClips = await staged.setBody(bodyAsset);
      if (!nextClips.includes(code.pose))
        throw new Error('This pose is unavailable for the selected body.');
      if (staged.bodyColorControls.length !== code.bodyColors.length)
        throw new Error('Body color channels no longer match.');
      code.bodyColors.forEach((c, i) => staged!.bodyColorControls[i].setColors(c));
      // Hair first, then hats, so existing hat fitting is applied to the final combination.
      for (const bundle of [...bundles].sort(
        (a, b) => Number(b.slots.includes('HR')) - Number(a.slots.includes('HR'))
      ))
        await staged.equipBundle(bundle);
      for (const [i, bundle] of bundles.entries()) {
        const saved = code.items[i];
        const controls = staged.itemColorControls(bundleKey(bundle));
        if (controls.length !== saved.colors.length)
          throw new Error(`${bundle.item.name}: saved color channels no longer match.`);
        saved.colors.forEach((c, n) => controls[n].setColors(c));
        if (saved.hair) staged.restoreHairState(saved.hair);
        if (saved.makeup) {
          if (!staged.makeupControls) throw new Error('Makeup controls are unavailable.');
          staged.makeupControls.place(saved.makeup.position);
          staged.makeupControls.scale(saved.makeup.scale);
          if (saved.makeup.offset) staged.makeupControls.move(...saved.makeup.offset);
          if (saved.makeup.rotation !== undefined)
            staged.makeupControls.rotate(saved.makeup.rotation);
        }
        const animations = staged.equipmentAnimationControls.filter(
          (c) => c.key === bundleKey(bundle)
        );
        if (animations.length !== saved.animations.length)
          throw new Error(`${bundle.item.name}: animation controls no longer match.`);
        saved.animations.forEach((name, n) => {
          if (!animations[n].names.includes(name))
            throw new Error(`${bundle.item.name}: unknown item animation.`);
          animations[n].set(name);
        });
      }
      await staged.setBackground(
        code.background ? `${assetBase}backgrounds/bg/bg_${code.background}.png` : null
      );
      staged.selectClip(code.pose);
      staged.selectExpression(code.expression);
      staged.setEffectsEnabled(code.effects);
      staged.setBrowserHairEnabled(code.browserMotion);
      staged.playing = code.playing;
      staged.view();
      staged.screenshot();
      if (!mounted) throw new Error('The wardrobe was closed during import.');
      viewer.destroy();
      staged.mount(container);
      viewer = staged;
      staged = undefined;
      if (dev) Object.assign(container, { outfitViewer: viewer });
      body = code.body;
      clips = nextClips;
      clip = code.pose;
      playing = code.playing;
      background = code.background;
      effectsEnabled = code.effects;
      browserHairEnabled = code.browserMotion;
      refresh();
      expression = code.expression;
      viewer.selectExpression(expression);
      page = 0;
      shareMessage = 'Outfit imported. All items and saved appearance settings restored.';
    } catch (cause) {
      shareError =
        (cause instanceof Error ? cause.message : 'Unable to import outfit') +
        ' Your current outfit is unchanged.';
    } finally {
      staged?.destroy();
      host?.remove();
      busy = false;
    }
  }
</script>

<svelte:head><title>Outfits | MapleStory 2 Handbook</title></svelte:head>
{#snippet slotButton(key: string, appearance = false)}
  {@const worn = equipped.find((b) => occupies(b, key))}
  <div class="slot-cell">
    <button
      class="equipment-slot"
      class:appearance-slot={appearance}
      class:active={slot === key}
      class:filled={Boolean(worn)}
      aria-label={`${slotNames[key]}: ${worn?.item.name ?? 'Empty'}`}
      aria-pressed={slot === key}
      title={`${slotNames[key]} · ${worn?.item.name ?? 'Choose an item'}`}
      onclick={() => selectSlot(key)}
    >
      <span class="slot-picture">
        {#if !appearance || !worn}<SlotIcon slot={key} size={68} />{/if}
        {#if worn}
          <img
            class="worn-background"
            src={`/resource/sprites/slot bg ${worn.item.rarity ?? 1}.png`}
            alt=""
            draggable="false"
          />
          <img class="worn-frame" src="/resource/sprites/slot_frame.png" alt="" draggable="false" />
          {#if worn.item.icon_path}<img
              class="worn-icon"
              class:linked-copy={key === 'PA' && worn.slots.includes('CL')}
              src={iconUrl(worn.item.icon_path)}
              alt=""
              draggable="false"
              onerror={(e) => e.currentTarget.setAttribute('hidden', '')}
            />{/if}
          {#if !appearance && worn.item.is_outfit}<img
              class="outfit-marker"
              src="/resource/sprites/icon_skin.png"
              alt=""
              draggable="false"
            />{/if}
        {/if}
      </span>
      <span class="slot-tooltip"
        >{slotNames[key]}{#if worn}: {worn.item.name}{/if}</span
      >
      {#if worn?.slots.includes('CL') && worn.slots.includes('PA')}<span class="sr-only"
          >Full outfit</span
        >{/if}
    </button>
    {#if worn}<button
        class="slot-remove"
        aria-label={`Unequip ${slotNames[key]}`}
        title={`Remove ${worn.item.name}`}
        disabled={busy}
        onclick={() => removeItem(worn)}><X size={14} /></button
      >{/if}
  </div>
{/snippet}
<main class="wardrobe">
  <header class="page-header">
    <div>
      <h1>Outfits</h1>
    </div>
    <div class="header-actions">
      <button disabled={busy || !ready} onclick={download}><Camera size={16} /> Save image</button>
      <button
        class="primary"
        disabled={busy || !ready || Boolean(preview)}
        onclick={() => {
          sharing = !sharing;
          shareError = '';
          shareMessage = '';
        }}><Upload size={16} /> Import / export</button
      >
    </div>
  </header>
  {#if previewName}<p>Loaded {previewName}'s saved appearance.</p>{/if}
  {#each previewNotes as note}<p class="notice">{note}</p>{/each}
  {#if omitted.length}<details class="notice">
      <summary>Character preview limitations</summary>{#each omitted as reason}<p>
          {reason}
        </p>{/each}
    </details>{/if}
  {#if sharing}<section class="sharing main-container" aria-label="Import and export outfit">
      <div class="panel-heading">
        <h2>Share your outfit</h2>
        <button aria-label="Close sharing" onclick={() => (sharing = false)}><X size={16} /></button
        >
      </div>
      <p>
        Save a text code with your items, colors, hair controls and studio settings. Codes contain
        appearance only and are readable, not private.
      </p>
      <div class="share-actions">
        <button disabled={busy} onclick={exportCode}
          ><Upload size={16} /> Export current outfit</button
        ><button disabled={!outfitText || busy} onclick={copyCode}
          ><Copy size={16} /> Copy code</button
        ><button disabled={!outfitText || busy} onclick={saveCode}
          ><Download size={16} /> Save text</button
        >
      </div>
      <label
        >Outfit code<textarea
          bind:value={outfitText}
          maxlength={MAX_CODE_LENGTH + 1}
          spellcheck="false"
          placeholder="Paste an MS2O. code here"
        ></textarea></label
      >
      <button class="primary" disabled={busy || !outfitText} onclick={importCode}
        ><Download size={16} /> Import outfit</button
      >
      <p class="muted">
        Import replaces the whole outfit after validation. Invalid or unavailable items leave your
        current outfit intact.
      </p>
      {#if shareError}<p role="alert" class="error">{shareError}</p>{/if}{#if shareMessage}<p
          role="status"
        >
          {shareMessage}
        </p>{/if}
    </section>{/if}
  {#if error}<p role="alert" class="error">{error}</p>{/if}
  {#each hatWarnings as warning}<p role="status" class="notice">{warning}</p>{/each}
  <div class="studio-layout">
    <section class="character-panel main-container" aria-label="Character">
      <div class="studio-toolbar">
        <label
          >Body<select
            aria-label="Body"
            disabled={busy}
            value={body}
            onchange={(e) => chooseBody(e.currentTarget.value)}
            ><option value="female">Female</option><option value="male">Male</option></select
          ></label
        >
        <label class="pose-control"
          >Pose<select
            aria-label="Pose"
            disabled={busy}
            bind:value={clip}
            onchange={() => {
              viewer?.selectClip(clip);
              expression = 'auto';
              playing = true;
            }}
          >
            {#each animationGroups(clips) as group}
              <optgroup label={group.label}>
                {#each group.clips as name}<option value={name}>{animationLabel(name)}</option
                  >{/each}
              </optgroup>
            {/each}</select
          ></label
        >
        <button
          disabled={busy || !clip}
          onclick={() => {
            playing = !playing;
            if (viewer) viewer.playing = playing;
          }}>{playing ? 'Pause' : 'Play'}</button
        >
      </div>
      <div class="fitting-room">
        <div class="slot-rail left-rail">
          {#each leftSlots as key}{@render slotButton(key)}{/each}
        </div>
        <div class="preview-wrap">
          <div bind:this={container} class="character-canvas" aria-label="Outfit preview"></div>
          {#if busy}<div class="loading-overlay" role="status">Loading character…</div>{/if}
        </div>
        <div class="slot-rail right-rail">
          {#each rightSlots as key}{@render slotButton(key)}{/each}
        </div>
        <div class="appearance-controls" aria-label="Appearance">
          {#each ['HR', 'FD', 'FA'] as key}{@render slotButton(key, true)}{/each}
        </div>
        {#if moving !== null}
          <button
            class="movement-surface"
            aria-label={moving === 'makeup'
              ? 'Move makeup on face'
              : `Move hair attachment ${moving + 1}`}
            onkeydown={moveKey}
            onpointerdown={(event) => {
              if (busy || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragStart = {
                pointer: event.pointerId,
                x: event.clientX,
                position: typeof moving === 'number' ? hairPlacements[moving].value : 0
              };
              movePointer(event);
            }}
            onpointermove={movePointer}
            onpointerup={() => (dragStart = undefined)}
            onpointercancel={() => (dragStart = undefined)}
            onlostpointercapture={() => (dragStart = undefined)}
          ></button>
          <div class="movement-hint">
            <span
              >{moving === 'makeup'
                ? 'Drag on the face to place makeup'
                : 'Drag left or right to move the attachment'}</span
            ><button onclick={() => (moving = null)}>Done moving</button>
          </div>
        {/if}
      </div>
      <div class="camera-views" aria-label="Camera views">
        {#each ['front', 'side', 'back'] as angle}<button
            disabled={busy}
            onclick={() => viewer?.view(angle as 'front' | 'side' | 'back')}
            >{angle[0].toUpperCase() + angle.slice(1)}</button
          >{/each}
      </div>
      <div class="extra-slots">
        <p class="muted">
          Drag to rotate · Scroll to zoom<br />Select an equipped slot to change its item or colors.
        </p>
      </div>
      <details class="studio-settings">
        <summary>Studio & body settings</summary>
        <div class="settings-grid">
          <label
            >Expression<select
              aria-label="Expression"
              disabled={busy}
              bind:value={expression}
              onchange={() => viewer?.selectExpression(expression)}
              ><option value="auto">Follow pose</option>{#each expressionOptions as name}<option
                  value={name}
                  >{name === 'default' ? 'Blink' : name[0].toUpperCase() + name.slice(1)}</option
                >{/each}</select
            ></label
          >
          <label
            >Background<select
              aria-label="Background"
              disabled={busy}
              value={background}
              onchange={(e) => chooseBackground(e.currentTarget.value)}
              ><option value="">Studio</option><option value="blue">Blue sky</option><option
                value="henesys_a">Henesys</option
              ><option value="ellinia_a">Ellinia</option></select
            ></label
          >
        </div>
        <div class="body-colors">
          <ColorPanel
            controls={colors.filter(
              (c) =>
                c.label === 'Skin' ||
                (!equipped.some((b) => b.slots.includes('FA')) && c.shader === 'Face')
            )}
            {customization}
            disabled={busy}
          />
        </div>
        <button class="clear-button" disabled={busy} onclick={clearOutfit}
          ><RotateCcw size={14} /> Clear outfit</button
        >
      </details>
    </section>
    <section class="item-panel main-container" aria-label="Item and color panel" aria-busy={busy}>
      <header class="panel-heading">
        <div>
          <h2>{slotNames[slot]}</h2>
        </div>
        <SlotIcon {slot} size={28} />
      </header>
      {#if selected}<div class="selected-item">
          <div class="selected-title">
            <Check size={16} /><span>{selected.item.name}</span><button
              aria-label={`Remove ${selected.item.name}`}
              disabled={busy}
              onclick={() => selected && removeItem(selected)}><X size={16} /> Remove</button
            >
          </div>
          {#if selected.slots.includes('CL') && selected.slots.includes('PA')}<p class="notice">
              Full outfit · occupies both top and pants. Replacing either slot removes this outfit.
            </p>{/if}
          {#if slot === 'FD' && makeupControls?.movable}<button
              class="move-action"
              disabled={busy}
              onclick={() => beginMove('makeup')}>Move on face</button
            >{/if}
          {#if slot === 'HR' && hairPlacements.length}<div class="move-actions">
              {#each hairPlacements as control, index}<button
                  disabled={busy || control.values.length < 2}
                  onclick={() => beginMove(index)}
                  >Move {hairPlacements.length === 1 ? 'hair' : `attachment ${index + 1}`}</button
                >{/each}
            </div>{/if}
          <details class="customize" bind:open={customizeOpen}>
            <summary>Colors & customization</summary>
            {#if slot === 'HR'}
              <div class="placement-controls">
                {#each hairPlacements as control, index}
                  <label
                    >{hairPlacements.length === 1
                      ? 'Hair position'
                      : `Attachment ${index + 1} position`}
                    <input
                      type="range"
                      aria-label={`Hair attachment ${index + 1} position`}
                      min="0"
                      max={control.values.length - 1}
                      step="0.01"
                      value={hairPosition(index)}
                      disabled={busy}
                      oninput={(event) => {
                        control.set(event.currentTarget.valueAsNumber);
                        placementRevision++;
                      }}
                    />
                  </label>
                  <div class="preset-choices">
                    {#each control.values as value}<button
                        disabled={busy}
                        aria-pressed={hairPosition(index) === value}
                        onclick={() => {
                          control.set(value);
                          placementRevision++;
                        }}>Preset {value + 1}</button
                      >{/each}<button
                      disabled={busy}
                      onclick={() => {
                        control.reset();
                        placementRevision++;
                      }}>Reset position</button
                    >
                  </div>
                {/each}
              </div>
              <div class="hair-length-controls">
                {#each hairControls as control}<div class="hair-length-control">
                    <label
                      ><span class="length-heading"
                        ><span>{control.label}</span>
                        {#if control.range}<span class="tabular-nums"
                            >{Number(control.value.toFixed(4))}</span
                          >{/if}</span
                      >
                      {#if control.range}
                        <input
                          type="range"
                          aria-label={control.label}
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
                          >{#each control.values as value}<option {value}>{value}</option
                            >{/each}</select
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
                  </div>{/each}
              </div>
            {/if}
            {#if slot === 'FD'}
              {#if makeupControls}
                <div class="placement-controls">
                  {#if makeupControls.placements.length > 1}<div
                      class="preset-choices"
                      aria-label="Makeup positions"
                    >
                      {#each makeupControls.placements as placement, index}<button
                          disabled={busy}
                          aria-label={`Makeup preset ${index + 1}`}
                          aria-pressed={placement
                            .slice(0, 3)
                            .every((value, i) => value === makeupControls?.value[i])}
                          onclick={() => {
                            makeupControls?.place(index);
                            makeupControls = viewer?.makeupControls;
                          }}>Preset {index + 1}</button
                        >{/each}
                    </div>{/if}
                  {#if makeupControls.movable}
                    <p class="muted">
                      Use Move on face, then drag in the preview. Arrow keys make small adjustments.
                    </p>
                  {/if}
                  {#if makeupControls.rotatable}<label
                      >Rotation · {Math.round((makeupControls.value[2] * 180) / Math.PI)}°
                      <input
                        aria-label="Makeup rotation"
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={Math.round((makeupControls.value[2] * 180) / Math.PI)}
                        disabled={busy}
                        oninput={(event) => {
                          makeupControls?.rotate(
                            (event.currentTarget.valueAsNumber * Math.PI) / 180
                          );
                          makeupControls = viewer?.makeupControls;
                        }}
                      /></label
                    >{/if}
                  {#if makeupControls.scaleRange[0] !== makeupControls.scaleRange[1]}<label
                      >Size <input
                        aria-label="Makeup size"
                        type="range"
                        min={makeupControls.scaleRange[0]}
                        max={makeupControls.scaleRange[1]}
                        step="0.001"
                        value={makeupControls.value[3]}
                        disabled={busy}
                        oninput={(event) => {
                          makeupControls?.scale(event.currentTarget.valueAsNumber);
                          makeupControls = viewer?.makeupControls;
                        }}
                      /></label
                    >{/if}
                  <button
                    disabled={busy}
                    onclick={() => {
                      makeupControls?.reset();
                      makeupControls = viewer?.makeupControls;
                    }}>Reset makeup</button
                  >
                </div>
              {/if}
            {/if}
            <ColorPanel controls={selectedColors} {customization} disabled={busy} />
            {#if slot === 'HR' && selected.item.id === 10200010}<label class="check-control"
                ><input
                  type="checkbox"
                  checked={browserHairEnabled}
                  disabled={busy}
                  onchange={(e) => toggleBrowserHair(e.currentTarget.checked)}
                /> Browser hair motion</label
              >
              <p class="muted">
                Approximate gravity and sway. Hair may intersect hats and shoulders. Turn off for
                the authored pose.
              </p>{/if}
            {#if slot === 'HR' && hasHairEffect}<label class="check-control"
                ><input
                  type="checkbox"
                  checked={effectsEnabled}
                  disabled={busy}
                  onchange={(e) => {
                    effectsEnabled = e.currentTarget.checked;
                    viewer?.setEffectsEnabled(effectsEnabled);
                  }}
                /> Hair effects</label
              >
              <p class="muted">Sparkle motion and glow may differ from the game.</p>{/if}
            {#if selected.weaponForms}<div class="share-actions">
                <button
                  disabled={busy || selected.weaponPlacement === 'drawn'}
                  onclick={() => placeWeapons('drawn')}>Draw weapons</button
                ><button
                  disabled={busy || selected.weaponPlacement === 'stowed'}
                  onclick={() => placeWeapons('stowed')}>Stow weapons</button
                >
              </div>{/if}
            {#each equipmentAnimations.filter((c) => c.key === bundleKey(selected)) as control}<label
                >Item animation<select
                  value={control.current}
                  disabled={busy}
                  onchange={(e) => {
                    control.set(e.currentTarget.value);
                    refresh();
                  }}
                  >{#each control.names as name}<option value={name}
                      >{name.replaceAll('_', ' ')}</option
                    >{/each}</select
                ></label
              >{/each}
            {#if !selectedColors.length && slot !== 'HR' && slot !== 'FD' && !selected.weaponForms}<p
                class="muted"
              >
                This item has no editable dye channels.
              </p>{/if}
          </details>
        </div>{:else}<p class="empty-slot">Nothing equipped here. Choose an item below.</p>{/if}
      <div class="catalog-filters">
        <label
          >Find an item<input
            type="search"
            placeholder={`Search ${slotNames[slot].toLowerCase()}…`}
            bind:value={search}
            oninput={() => (page = 0)}
          /></label
        >
      </div>
      <p class="catalog-count">{total.toLocaleString()} items · outfits & equipment</p>
      {#if loadingCatalog}<p role="status" class="empty-slot">
          Searching the wardrobe…
        </p>{:else if catalogError}<p role="alert" class="error">{catalogError}</p>
        <button onclick={() => retry++}>Retry</button>{:else}
        {#if !items.length}<p class="empty-slot">No items match. Try another name.</p>{/if}
        <div class="item-grid">
          {#each items as item (item.id)}
            {@const available = item.library && item.library.availability !== 'unavailable'}
            {@const isEquipped = selected?.item.id === item.id}
            <div class="item-card" class:equipped-choice={isEquipped}>
              <button
                class="equip-choice"
                disabled={busy || !available}
                aria-pressed={isEquipped}
                aria-label={`Equip ${item.name}${item.library?.handParts ? ` in ${slot === 'LH' ? 'left' : 'right'} hand` : ''}`}
                onclick={() =>
                  equip(item, item.library?.handParts ? (slot === 'LH' ? 'LH' : 'RH') : undefined)}
              >
                <span class="item-picture"
                  >{#if item.icon_path}<img
                      src={iconUrl(item.icon_path)}
                      alt=""
                      loading="lazy"
                      onerror={(e) => e.currentTarget.setAttribute('hidden', '')}
                    />{/if}</span
                >
                <span class="item-name">{item.name}</span>
                {#if item.library?.slots.includes('CL') && item.library.slots.includes('PA')}<span
                    class="item-status">Top + pants</span
                  >{/if}
              </button>
            </div>
          {/each}
        </div>
        <nav class="pagination" aria-label="Catalog pages">
          <button aria-label="Previous page" disabled={page === 0 || busy} onclick={() => page--}
            ><ChevronLeft size={16} /></button
          ><span>{page + 1} / {Math.max(1, Math.ceil(total / limit))}</span><button
            aria-label="Next page"
            disabled={(page + 1) * limit >= total || busy}
            onclick={() => page++}><ChevronRight size={16} /></button
          >
        </nav>
      {/if}
    </section>
  </div>
</main>

<style>
  .slot-cell {
    position: relative;
    pointer-events: auto;
  }
  .slot-remove {
    position: absolute;
    z-index: 3;
    top: -4px;
    right: -4px;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 50%;
    background: var(--color-surface-800);
  }
  .movement-surface,
  .movement-surface:enabled:hover {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    cursor: move;
    touch-action: none;
  }
  .movement-hint {
    position: absolute;
    z-index: 3;
    bottom: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: 65%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem;
    background: var(--color-surface-800);
    border-radius: 0.4rem;
    font-size: 0.7rem;
    text-align: center;
  }
  .placement-controls {
    display: grid;
    gap: 0.6rem;
    margin: 0.8rem 0;
  }
  .preset-choices,
  .move-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .preset-choices button[aria-pressed='true'] {
    border-color: var(--color-primary-500);
    background: var(--color-primary-950);
  }
  .move-action,
  .move-actions {
    margin: 0.7rem 0;
  }

  .wardrobe {
    max-width: 1440px;
    margin: 0 auto;
    padding: 1.5rem;
    color: var(--color-surface-50);
  }
  .page-header,
  .panel-heading,
  .selected-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .page-header {
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
  }
  h2 {
    font-size: 1.2rem;
    font-weight: 650;
  }
  .muted {
    color: var(--color-surface-300);
    font-size: 0.78rem;
    line-height: 1.6;
  }
  button,
  select,
  input[type='search'],
  textarea {
    border: 1px solid var(--color-surface-400);
    border-radius: 0.5rem;
    background: var(--color-surface-700);
    color: var(--color-surface-50);
    padding: 0.5rem 0.7rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  button:enabled:hover {
    background: var(--color-surface-600);
    border-color: var(--color-primary-500);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  :is(button, select, input, textarea, summary):focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 3px;
  }
  .primary {
    background: var(--color-primary-900);
    border-color: var(--color-primary-700);
  }
  .header-actions,
  .share-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .studio-layout {
    display: grid;
    grid-template-columns: minmax(0, 674px) minmax(340px, 1fr);
    gap: 1.25rem;
    align-items: start;
  }
  .character-panel,
  .item-panel,
  .sharing {
    border: 1px solid var(--color-gray2);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .character-panel {
    padding: 1rem;
    position: sticky;
    top: 1rem;
  }
  .studio-toolbar {
    display: flex;
    justify-content: center;
    align-items: end;
    gap: 0.65rem;
    margin-bottom: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--color-surface-100);
    min-width: 0;
  }
  select {
    max-width: 100%;
    font-size: 0.8rem;
    min-width: 0;
  }
  .pose-control {
    flex: 1;
    max-width: 18.75rem;
  }
  .pose-control select {
    width: 100%;
  }
  .appearance-controls {
    position: absolute;
    z-index: 2;
    top: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
  }
  .appearance-slot .slot-picture {
    display: grid;
    place-items: center;
  }
  .appearance-slot .slot-tooltip {
    top: calc(100% + 0.3rem);
    bottom: auto;
    left: 50%;
    transform: translateX(-50%);
  }
  .fitting-room {
    position: relative;
    max-width: 640px;
    margin: 0 auto;
    overflow: hidden;
    border: 2px solid var(--color-surface-400);
    border-radius: 0.5rem;
    background: #000 url('/outfits/character-background.png') center / cover;
    box-shadow: inset 0 0 0 1px var(--color-surface-950);
  }
  .slot-rail {
    position: absolute;
    z-index: 2;
    top: 0.6rem;
    bottom: 0.6rem;
    display: grid;
    grid-template-rows: repeat(6, 1fr);
    align-items: center;
    gap: 0.4rem;
    pointer-events: none;
  }
  .left-rail {
    left: 0.6rem;
  }
  .right-rail {
    right: 0.6rem;
  }
  .right-rail .slot-cell:nth-child(4) {
    grid-row: 5;
  }
  .right-rail .slot-cell:nth-child(5) {
    grid-row: 6;
  }
  .equipment-slot {
    position: relative;
    width: 65px;
    height: 65px;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0.3rem;
    background: transparent;
    pointer-events: auto;
  }
  .equipment-slot:enabled:hover {
    background: transparent;
    box-shadow: 0 0 0 1px var(--color-primary-400);
  }
  .equipment-slot.active {
    box-shadow: 0 0 0 2px var(--color-primary-500);
  }
  .slot-picture {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
  }
  .slot-picture :global(img) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .slot-picture .worn-background,
  .slot-picture .worn-icon {
    inset: 5%;
    width: 90%;
    height: 90%;
  }
  .slot-picture .linked-copy {
    filter: brightness(0.5);
  }
  .slot-picture .outfit-marker {
    inset: auto auto 3% 3%;
    width: 24%;
    height: auto;
  }
  .slot-tooltip {
    position: absolute;
    z-index: 2;
    bottom: calc(100% + 0.3rem);
    left: 0;
    width: max-content;
    max-width: 180px;
    padding: 0.35rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--color-surface-950);
    color: var(--color-surface-50);
    font-size: 0.7rem;
    opacity: 0;
    pointer-events: none;
  }
  .right-rail .slot-tooltip {
    left: auto;
    right: 0;
  }
  .equipment-slot:is(:hover, :focus-visible) .slot-tooltip {
    opacity: 1;
  }
  .preview-wrap {
    min-width: 0;
  }
  .character-canvas {
    width: 100%;
    height: 565px;
  }
  .camera-views {
    display: flex;
    justify-content: center;
    gap: 0.25rem;
    margin-top: 0.6rem;
  }
  .camera-views button {
    font-size: 0.7rem;
    padding: 0.35rem 0.6rem;
  }
  .loading-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--color-surface-800) 75%, transparent);
    font-size: 0.85rem;
    pointer-events: none;
  }
  .extra-slots {
    display: flex;
    gap: 0.65rem;
    margin-top: 0.65rem;
    align-items: center;
  }
  .extra-slots p {
    margin-left: auto;
    text-align: right;
  }
  .studio-settings {
    container-type: inline-size;
    max-width: 48.7rem;
    margin: 1rem auto 0;
    border-top: 1px solid var(--color-surface-400);
    padding-top: 0.8rem;
  }
  summary {
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.2rem 0;
  }
  .settings-grid,
  .body-colors {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 0.7rem;
    max-width: 48.7rem;
    margin: 0.8rem auto 0;
  }
  .body-colors :global(.dye-control) {
    width: 100%;
    margin-top: 0;
  }
  @container (max-width: 38rem) {
    .settings-grid,
    .body-colors {
      grid-template-columns: minmax(0, 1fr);
      max-width: 24rem;
    }
  }
  .clear-button {
    margin-top: 1rem;
  }
  .item-panel {
    padding: 1rem;
  }
  .panel-heading {
    padding-bottom: 0.9rem;
    color: var(--color-surface-50);
  }
  .selected-item {
    background: var(--color-surface-700);
    border: 1px solid var(--color-surface-400);
    border-radius: 0.6rem;
    padding: 0.7rem;
    margin-bottom: 1rem;
  }
  .selected-title {
    font-size: 0.85rem;
    gap: 0.5rem;
    font-weight: 600;
  }
  .selected-title span {
    flex: 1;
  }
  .selected-title button {
    padding: 0.25rem;
  }
  .customize {
    margin-top: 0.6rem;
    border-top: 1px solid var(--color-surface-400);
    padding-top: 0.4rem;
  }
  .customize > label {
    margin-top: 0.7rem;
  }
  .hair-length-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: 0.7rem;
    margin-top: 0.7rem;
  }
  .hair-length-control {
    min-width: 0;
  }
  .length-heading {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .hair-length-control > button {
    margin-top: 0.4rem;
    font-size: 0.7rem;
  }
  .check-control {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  .catalog-filters {
    display: flex;
    gap: 0.5rem;
  }
  .catalog-filters > label:first-child {
    flex: 1;
  }
  input[type='search'] {
    width: 100%;
    min-width: 0;
    font-size: 0.8rem;
  }
  .catalog-count {
    color: var(--color-surface-300);
    font-size: 0.7rem;
    margin: 0.7rem 0;
  }
  .item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 6rem), 1fr));
    gap: 0.5rem;
  }
  .item-card {
    background: var(--color-surface-700);
    border: 1px solid var(--color-surface-400);
    border-radius: 0.6rem;
    overflow: hidden;
    min-width: 0;
  }
  .equipped-choice {
    border-color: var(--color-primary-500);
    background: var(--color-primary-950);
  }
  .equip-choice {
    border: 0;
    background: transparent;
    width: 100%;
    height: 100%;
    flex-direction: column;
    justify-content: start;
    padding: 0.6rem 0.3rem;
    gap: 0.35rem;
  }
  .item-picture {
    width: 46px;
    height: 46px;
    position: relative;
    display: grid;
    place-items: center;
    color: var(--color-surface-300);
  }
  .item-picture img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .item-name {
    font-size: 0.68rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .item-status {
    color: var(--color-surface-200);
    font-size: 0.58rem;
  }
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    font-size: 0.75rem;
  }
  .empty-slot {
    padding: 1rem 0.5rem;
    font-size: 0.8rem;
    color: var(--color-surface-300);
    line-height: 1.6;
  }
  .notice {
    color: var(--color-warning-300);
    font-size: 0.75rem;
    line-height: 1.5;
    margin: 0.6rem 0;
  }
  .error {
    padding: 0.75rem;
    color: var(--color-error-300);
    border: 1px solid var(--color-error-700);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .sharing {
    padding: 1rem;
    margin-bottom: 1.25rem;
  }
  .sharing p {
    font-size: 0.8rem;
    margin-bottom: 0.7rem;
  }
  .sharing label {
    margin: 0.75rem 0;
  }
  textarea {
    min-height: 95px;
    width: 100%;
    resize: vertical;
    overflow-wrap: anywhere;
    font-family: monospace;
  }
  @media (max-width: 1100px) {
    .wardrobe {
      padding: 1rem;
    }
    .character-panel {
      padding: 0.7rem;
    }
  }
  @media (max-width: 850px) {
    .studio-layout {
      grid-template-columns: 1fr;
    }
    .character-panel {
      position: static;
    }
    .character-canvas {
      height: 565px;
    }
    .page-header {
      align-items: start;
    }
    .header-actions {
      justify-content: end;
      max-width: 170px;
    }
  }
  @media (max-width: 480px) {
    .wardrobe {
      padding: 0.6rem;
    }
    .fitting-room {
      width: 100%;
    }
    .equipment-slot {
      width: 48px;
      height: 48px;
    }
    .character-canvas {
      height: 490px;
    }
    .studio-toolbar {
      gap: 0.4rem;
    }
    .extra-slots p {
      font-size: 0.65rem;
    }
    .page-header h1 {
      font-size: 1.6rem;
    }
    .header-actions button {
      font-size: 0.7rem;
    }
  }
</style>
