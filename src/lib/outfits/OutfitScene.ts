import {
  AnimationMixer,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  captureBodySkeleton,
  shareSkeleton,
  releaseEquipmentBones,
  equipmentMixers,
  equipmentAnimationControls,
  sourceName,
  type BodySkeleton
} from './sharedSkeleton';
import type { NativeAsset } from '$lib/nativeAssets';
import { loadColorControls, type ColorControl, type Rgb } from './materialColors';
import { hidesBodyPart } from './bodyVisibility';
import { SkinColors, isSkinColor } from './skinColors';
import {
  bundleKey,
  conflictingItems,
  fitHair,
  placeWeapon,
  libraryBase,
  type OutfitBundle
} from './catalog';
import { FaceAnimation, type Customization } from './faceAnimation';
import { FaceDecal } from './faceDecal';
import { applyCharacterMaterials } from './characterMaterials';
import { CosmeticEffect } from './cosmeticEffect';
import {
  captureHairDefault,
  hairLengthControl,
  hairLengthIndex,
  applySavedHairLength,
  hairScaleRange,
  hairScaleUiValue,
  validHairScale,
  type HairScaleRange
} from './hairLengthControls';
import { sharedHairColor } from './hairColors';
import { fitMovableHat, hatPlacementSource, needsHatPlacement } from './hatAttachment';
import {
  createHairPlacement,
  hairPlacementSource,
  type HairPlacementControl
} from './hairPlacement';
import { applyItemDefault, itemDefaultColors, ItemPaletteAnimation } from './itemDefaults';
import { viewDistance } from './viewFraming';

function dispose(root: Object3D) {
  releaseEquipmentBones(root);
  const textures = new Set<Texture>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
      material.dispose();
    }
    if ('skeleton' in node) {
      const skeleton = node.skeleton as { dispose: () => void };
      skeleton.dispose();
    }
  });
  for (const texture of textures) texture.dispose();
}

export class OutfitScene {
  private scene = new Scene();
  private camera = new PerspectiveCamera(35, 1, 0.01, 2000);
  private renderer: WebGLRenderer;
  private controls: OrbitControls;
  private loader = new GLTFLoader();
  private body?: GLTF;
  private bones?: BodySkeleton;
  private mixer?: AnimationMixer;
  private equipment = new Map<string, Group>();
  private cosmeticEffects = new Map<string, CosmeticEffect>();
  effectsEnabled = true;
  private equipmentAssets = new Map<string, NativeAsset>();
  private bundles = new Map<string, OutfitBundle>();
  private hairLengths = new Map<string, number>();
  private hairPlacements = new Map<string, HairPlacementControl[]>();
  private hairPlacementValues = new Map<string, number>();
  private hatFitSignature = '';
  get hatAttachmentWarnings(): string[] {
    const hair = this.equippedItems.find((bundle) => bundle.slots.includes('HR'));
    if (hair && hatPlacementSource(hair.item.library?.presetId ?? hair.item.id)) return [];
    return this.equippedItems
      .filter((bundle) => bundle.parts.some(needsHatPlacement))
      .map(
        (bundle) =>
          `${bundle.item.name} is hidden until you equip a hairstyle with a movable-hat placement.`
      );
  }
  refreshHatAttachments(force = false) {
    const hair = this.equippedItems.find((bundle) => bundle.slots.includes('HR'));
    const hairGroup = hair && this.equipment.get(bundleKey(hair));
    const placement = hair && hatPlacementSource(hair.item.library?.presetId ?? hair.item.id);
    const hats = [...this.equipmentAssets].filter(([, asset]) => needsHatPlacement(asset));
    if (!hats.length) {
      this.hatFitSignature = '';
      return;
    }
    const morphs: number[] = [];
    hairGroup?.traverse((node) => {
      if (node instanceof Mesh) morphs.push(...(node.morphTargetInfluences ?? []));
    });
    const signature = JSON.stringify([
      hairGroup?.uuid,
      hats.map(([key]) => [key, this.equipment.get(key.slice(0, key.lastIndexOf(':')))?.uuid]),
      morphs,
      this.hairPlacementControls.map((control) => control.value)
    ]);
    if (!force && signature === this.hatFitSignature) return;
    this.hatFitSignature = signature;
    for (const [key] of hats) {
      const group = this.equipment.get(key.slice(0, key.lastIndexOf(':')))!;
      // A movable cap has no meaningful default without a hairstyle to fit to.
      group.visible = Boolean(hairGroup && placement);
      if (hairGroup && placement) fitMovableHat(group, placement, hairGroup);
    }
  }
  get hairPlacementControls() {
    return [...this.hairPlacements.values()].flat();
  }
  private applyHairPlacements() {
    for (const controls of this.hairPlacements.values())
      for (const control of controls) control.apply();
    this.refreshHatAttachments();
  }
  private face?: FaceAnimation;
  private decal?: FaceDecal;
  private defaultFace?: FaceAnimation;
  private customization?: Customization;
  private customizationBase = libraryBase;
  private variant = '';
  private background?: Texture;
  private backgroundRequest = 0;
  private bodyColors: ColorControl[] = [];
  private skinColors?: SkinColors;
  private equipmentColors = new Map<string, ColorControl[]>();
  private paletteAnimations = new Map<string, ItemPaletteAnimation[]>();
  private bodyVisibility = new Map<Object3D, boolean>();
  private request = 0;
  private alive = true;
  private frame = 0;
  private previous = 0;
  private resize: ResizeObserver;
  playing = false;

  get equippedItems(): OutfitBundle[] {
    return [...this.bundles.values()];
  }
  get equipmentAnimationControls() {
    return [...this.equipment].flatMap(([key, group]) =>
      equipmentAnimationControls(group).map((control, index) => ({
        ...control,
        label: `${this.bundles.get(key)?.item.name ?? key} animation${index ? ` ${index + 1}` : ''}`
      }))
    );
  }
  get makeupControls() {
    return this.decal?.controls;
  }
  setCustomization(data: Customization, base = libraryBase) {
    this.customization = data;
    this.customizationBase = base;
  }
  setItemColors(id: number | string, colors: Rgb[]) {
    if (this.bundles.get(String(id))?.slots.includes('FA')) {
      this.face?.control.setColors(colors);
      return;
    }
    for (const control of this.equipmentColors.get(String(id)) ?? [])
      if (!isSkinColor(control)) control.setColors(colors);
  }
  inspect() {
    const visible: string[] = [];
    this.scene.traverseVisible((node) => {
      if (node instanceof Mesh) visible.push(sourceName(node));
    });
    return {
      body: this.variant,
      equipped: this.equippedItems.map((b) => ({
        id: b.item.id,
        key: bundleKey(b),
        slots: b.slots
      })),
      visible,
      hatAttachmentWarnings: this.hatAttachmentWarnings,
      effects: [...this.cosmeticEffects].map(([key, effect]) => ({
        key,
        enabled: effect.enabled,
        particles: effect.simulations.map((s) => s.particles.length),
        time: effect.simulations[0]?.time
      })),
      memory: { ...this.renderer.info.memory },
      colors: this.colorControls.map((c) => ({ label: c.label, colors: c.colors }))
    };
  }
  seek(time: number) {
    this.playing = false;
    this.mixer?.setTime(time);
    for (const animations of this.paletteAnimations.values())
      for (const animation of animations) animation.seek(time);
    for (const group of this.equipment.values())
      for (const mixer of equipmentMixers(group)) mixer.setTime(time);
    this.applyHairPlacements();
    this.body?.scene.updateMatrixWorld(true);
    for (const effect of this.cosmeticEffects.values()) effect.seek(time, this.camera);
    this.renderer.render(this.scene, this.camera);
  }
  setEffectsEnabled(enabled: boolean) {
    this.effectsEnabled = enabled;
    for (const effect of this.cosmeticEffects.values()) {
      effect.enabled = enabled;
      effect.update(0, this.camera);
    }
    this.renderer.render(this.scene, this.camera);
  }
  selectExpression(name: string) {
    (this.face ?? this.defaultFace)?.select(name);
  }
  get hairControls(): {
    label: string;
    values: number[];
    range?: HairScaleRange;
    value: number;
    set: (value: number) => void;
    reset: () => void;
  }[] {
    const controls: {
      label: string;
      values: number[];
      range?: HairScaleRange;
      value: number;
      set: (value: number) => void;
      reset: () => void;
    }[] = [];
    for (const [key, bundle] of this.bundles) {
      const scales = bundle.item.library?.hairScales;
      if (!scales?.length || bundle.item.library?.customize.scale !== '1') continue;
      const presetId = bundle.item.library.presetId ?? bundle.item.id;
      const tailRange = hairScaleRange(presetId, 0, scales[0]);
      const placements = this.hairPlacements.get(key);
      if (placements?.length && (tailRange || new Set(scales[0]).size > 1)) {
        const set = (value: number) => {
          this.hairLengths.set(`${bundle.item.id}:attachment`, value);
          for (const placement of placements) placement.setScale(value);
        };
        controls.push({
          label: `${bundle.item.name} tail size`,
          values: scales[0],
          range: tailRange,
          value: hairScaleUiValue(placements[0].scale, tailRange),
          set(value) {
            if (!validHairScale(value, scales[0], tailRange))
              throw new Error('Unsupported hair size');
            const stored = hairScaleUiValue(value, tailRange);
            set(tailRange ? Math.min(tailRange.max, Math.max(tailRange.min, stored)) : stored);
          },
          reset: () => set(1)
        });
      }
      this.equipment.get(key)?.traverse((node) => {
        if (!(node instanceof Mesh) || node.morphTargetInfluences?.length !== 1) return;
        const index = hairLengthIndex(sourceName(node));
        if (index === undefined) return;
        const values = scales[index];
        if (!values?.length) return;
        const control = hairLengthControl(
          node,
          `${bundle.item.name} length ${Number(index) + 1}`,
          values,
          (value) => this.hairLengths.set(`${bundle.item.id}:${index}`, value),
          hairScaleRange(presetId, index, values)
        );
        if (control) controls.push(control);
      });
    }
    return controls;
  }
  setHairLengths(lengths: readonly number[]) {
    if (lengths.some((value) => !Number.isFinite(value) || value < 0))
      throw new Error('Invalid saved hair length');
    const applied: { target: string; index: number; value: number }[] = [];
    for (const [key, bundle] of this.bundles) {
      if (!bundle.slots.includes('HR')) continue;
      lengths.forEach((value, index) => this.hairLengths.set(`${bundle.item.id}:${index}`, value));
      this.equipment.get(key)?.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        const target = sourceName(node);
        const index = hairLengthIndex(target);
        if (index === undefined || lengths[index] === undefined) return;
        if (applySavedHairLength(node, lengths[index]))
          applied.push({ target, index, value: lengths[index] });
      });
      // CPonyTailController applies the back length to both attachment pieces.
      if (lengths[0] !== undefined) {
        this.hairLengths.set(`${bundle.item.id}:attachment`, lengths[0]);
        for (const placement of this.hairPlacements.get(key) ?? []) {
          placement.setScale(lengths[0]);
          applied.push({ target: placement.label, index: 0, value: lengths[0] });
        }
      }
    }
    return applied;
  }
  async setBackground(url: string | null) {
    const request = ++this.backgroundRequest;
    const texture = url ? await new TextureLoader().loadAsync(url) : undefined;
    if (request !== this.backgroundRequest || !this.alive) {
      texture?.dispose();
      return;
    }
    this.background?.dispose();
    this.background = texture;
    if (texture) texture.colorSpace = SRGBColorSpace;
    this.scene.background = texture ?? new Color('#303844');
  }
  view(angle: 'front' | 'side' | 'back' = 'front') {
    if (!this.body) return;
    this.body.scene.updateMatrixWorld(true);
    // SkinnedMesh caches its first bounding box. Use current deformed vertices
    // when framing a new pose so running hair, hands and back items stay in view.
    const box = new Box3().setFromObject(this.body.scene, true);
    for (const group of this.equipment.values()) box.union(new Box3().setFromObject(group, true));
    for (const effect of this.cosmeticEffects.values())
      if (effect.enabled) box.union(effect.framingBounds());
    const center = box.getCenter(new Vector3()),
      size = box.getSize(new Vector3());
    const distance = viewDistance(size, this.camera.aspect, this.camera.fov, angle);
    this.controls.target.copy(center);
    const direction =
      angle === 'side' ? new Vector3(1, 0, 0) : new Vector3(0, 0, angle === 'back' ? -1 : 1);
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.controls.update();
  }

  get colorControls(): ColorControl[] {
    return [
      ...(this.skinColors?.control ? [this.skinColors.control] : []),
      ...((this.face ?? this.defaultFace) ? [(this.face ?? this.defaultFace)!.control] : []),
      ...[...this.equipmentColors.entries()].flatMap(([key, controls]) =>
        this.bundles.get(key)?.item.dyeable && !this.bundles.get(key)?.slots.includes('FA')
          ? controls.filter((control) => !isSkinColor(control))
          : []
      )
    ];
  }

  constructor(private element: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.scene.background = new Color('#303844');
    // character_spring2019 inherits white ambient and directional Dimmer=0.8.
    // Three's irradiance convention includes PI; characterMaterials removes it.
    this.scene.add(new AmbientLight(0xffffff, Math.PI * 0.8));
    const light = new DirectionalLight(0xffffff, Math.PI * 0.8);
    light.position.set(3, 5, 4);
    this.scene.add(light);
    element.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    const resize = () => {
      const width = element.clientWidth,
        height = element.clientHeight;
      if (!width || !height) return;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    };
    this.resize = new ResizeObserver(resize);
    this.resize.observe(element);
    resize();
    const draw = (time: number) => {
      if (!this.alive) return;
      const delta = this.previous ? Math.min((time - this.previous) / 1000, 0.1) : 0;
      this.previous = time;
      if (this.playing) {
        this.mixer?.update(delta);
        for (const animations of this.paletteAnimations.values())
          for (const animation of animations) animation.update(delta);
        for (const group of this.equipment.values())
          for (const mixer of equipmentMixers(group)) mixer.update(delta);
      }
      (this.face ?? this.defaultFace)?.update(delta);
      this.applyHairPlacements();
      for (const effect of this.cosmeticEffects.values())
        effect.update(this.playing ? delta : 0, this.camera);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(draw);
    };
    this.frame = requestAnimationFrame(draw);
  }

  async setBody(asset: NativeAsset): Promise<string[]> {
    const request = ++this.request;
    const body = await this.loader.loadAsync(asset.url);
    let defaultFace: FaceAnimation | undefined;
    let colors: ColorControl[] = [];
    try {
      await applyCharacterMaterials(body);
      colors = await loadColorControls(body);
      const preset =
        this.customization?.faces[asset.bodyVariant === 'male' ? '10300001' : '10300003'];
      if (preset && this.customization) {
        defaultFace = await FaceAnimation.load(
          preset,
          this.customization.palettes['3'][0].colors,
          this.customizationBase
        );
        defaultFace.attach(body.scene);
      }
    } catch (error) {
      defaultFace?.dispose();
      for (const color of colors) color.dispose();
      dispose(body.scene);
      throw error;
    }
    if (!this.alive || request !== this.request) {
      for (const color of colors) color.dispose();
      defaultFace?.dispose();
      dispose(body.scene);
      return [];
    }
    let bones: BodySkeleton;
    let skinColors: SkinColors;
    try {
      bones = captureBodySkeleton(body.scene);
      skinColors = new SkinColors(colors);
    } catch (error) {
      defaultFace?.dispose();
      for (const color of colors) color.dispose();
      dispose(body.scene);
      throw error;
    }
    for (const slot of this.equipment.keys()) this.unequip(slot);
    this.hairLengths.clear();
    this.hairPlacementValues.clear();
    this.defaultFace?.dispose();
    this.defaultFace = defaultFace;
    this.variant = asset.bodyVariant ?? '';
    if (this.body) {
      for (const color of this.bodyColors) color.dispose();
      this.scene.remove(this.body.scene);
      this.mixer?.stopAllAction();
      dispose(this.body.scene);
    }
    this.body = body;
    this.bodyColors = colors;
    this.skinColors = skinColors;
    this.bodyVisibility.clear();
    body.scene.traverse((node) => this.bodyVisibility.set(node, node.visible));
    this.bones = bones;
    this.mixer = new AnimationMixer(body.scene);
    this.scene.add(body.scene);
    body.scene.traverse((node) => {
      if (node instanceof Mesh) node.frustumCulled = false;
    });
    const box = new Box3().setFromObject(body.scene);
    const center = box.getCenter(new Vector3()),
      size = box.getSize(new Vector3()).length();
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(new Vector3(0, size * 0.05, size * 1.6));
    this.camera.far = Math.max(100, size * 100);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.playing = false;
    return body.animations.map((clip) => clip.name);
  }

  async equipBundle(bundle: OutfitBundle) {
    const hat = bundle.slots.includes('CP')
      ? bundle
      : this.equippedItems.find((b) => b.slots.includes('CP'));
    const form = hat?.item.library?.hatHairForm ?? 'a';
    const changes = [bundle.slots.includes('HR') ? fitHair(bundle, form) : bundle];
    const hair = this.equippedItems.find((b) => b.slots.includes('HR'));
    if (bundle.slots.includes('CP') && hair && hair.hairForm !== form)
      changes.push(fitHair(hair, form));
    await this.changeEquipment(changes);
  }

  async setWeaponPlacement(placement: 'drawn' | 'stowed') {
    const weapons = this.equippedItems.filter((bundle) => bundle.weaponForms);
    await this.changeEquipment(weapons.map((bundle) => placeWeapon(bundle, placement)));
  }

  async removeItem(id: string) {
    const item = this.bundles.get(id);
    const hair = this.equippedItems.find((b) => b.slots.includes('HR'));
    if (item?.slots.includes('CP') && hair && hair.hairForm !== 'a')
      await this.changeEquipment([fitHair(hair, 'a')], [id]);
    else this.unequip(id);
  }

  private async changeEquipment(changes: OutfitBundle[], remove: string[] = []) {
    if (!this.bones) throw new Error('Select a body first');
    const request = this.request;
    const staged: {
      bundle: OutfitBundle;
      group: Group;
      colors: ColorControl[];
      face?: FaceAnimation;
      decal?: FaceDecal;
      effect?: CosmeticEffect;
      paletteAnimations?: ItemPaletteAnimation[];
      placements?: HairPlacementControl[];
    }[] = [];
    try {
      for (const bundle of changes) {
        if (bundle.item.library?.bodyVariant !== this.variant)
          throw new Error('This item belongs to another body');
        const entry: (typeof staged)[number] = { bundle, group: new Group(), colors: [] };
        staged.push(entry);
        for (const asset of bundle.parts) {
          if (!asset.slot || !asset.skeleton)
            throw new Error('Equipment has no exported attachment');
          const gear = await this.loader.loadAsync(asset.url);
          try {
            await applyCharacterMaterials(gear);
            entry.colors.push(...(await loadColorControls(gear)));
            const attached = shareSkeleton(gear.scene, this.bones, gear.animations);
            entry.group.add(attached);
            if (bundle.slots.includes('HR')) {
              const part = hairPlacementSource(
                bundle.item.library?.presetId ?? bundle.item.id,
                asset
              );
              if (part) {
                const key = `${bundle.item.id}:${part.source}`;
                entry.placements ??= [];
                entry.placements.push(
                  createHairPlacement(
                    attached,
                    part,
                    `${bundle.item.name} placement ${entry.placements.length + 1}`,
                    this.hairPlacementValues.get(key) ?? 0,
                    (value) => this.hairPlacementValues.set(key, value),
                    this.hairLengths.get(`${bundle.item.id}:attachment`) ?? 1
                  )
                );
              }
            }
          } catch (error) {
            dispose(gear.scene);
            throw error;
          }
        }
        if (bundle.slots.includes('FA')) {
          const preset = this.customization?.faces[String(bundle.item.id)];
          if (!preset || !this.customization) throw new Error('Face textures are unavailable');
          entry.face = await FaceAnimation.load(
            preset,
            this.customization.palettes['3'][0].colors,
            this.customizationBase
          );
          entry.face.attach(entry.group);
        }
        if (bundle.slots.includes('FD')) {
          if (!bundle.item.library?.decal || !this.body)
            throw new Error('Makeup metadata is unavailable');
          entry.decal = await FaceDecal.load(
            bundle.item.library.decal,
            this.customizationBase,
            this.body.scene,
            this.customization?.palettes[bundle.item.library.customize.colorPalette]?.[0]?.colors
          );
          if (entry.decal.control) entry.colors.push(entry.decal.control);
        }
        if (bundle.item.library?.cosmeticEffect) {
          if (!bundle.slots.includes('HR')) throw new Error('Only hair effects are supported');
          const heads: Object3D[] = [];
          this.body?.scene.traverse((node) => {
            if (sourceName(node) === 'Bip01 Head') heads.push(node);
          });
          if (heads.length !== 1) throw new Error('Hair effect attachment is unavailable');
          entry.effect = await CosmeticEffect.load(
            this.customizationBase + bundle.item.library.cosmeticEffect,
            bundle.item.id,
            heads[0]
          );
          entry.effect.enabled = this.effectsEnabled;
        }
        if (entry.placements?.length) {
          const hair = entry.colors.filter((color) => !isSkinColor(color));
          if (hair.length)
            entry.colors = [...entry.colors.filter(isSkinColor), sharedHairColor(hair)];
        }
        const animatedDefaults = bundle.item.library?.customize.defaultColorIndex?.includes(',');
        if (animatedDefaults && this.customization && bundle.item.library) {
          entry.paletteAnimations = entry.colors
            .filter((color) => !isSkinColor(color))
            .map(
              (control) =>
                new ItemPaletteAnimation(
                  control,
                  bundle.item.library!.customize,
                  this.customization!.palettes
                )
            );
        }
        const defaults =
          !animatedDefaults &&
          this.customization &&
          bundle.item.library &&
          itemDefaultColors(bundle.item.library.customize, this.customization.palettes);
        if (defaults) {
          for (const control of entry.colors.filter((color) => !isSkinColor(color)))
            applyItemDefault(control, defaults);
        }
        // A cap changes the same hairstyle's authored geometry, preserving its dye.
        if (
          (bundle.slots.includes('HR') || bundle.weaponForms) &&
          this.bundles.has(bundleKey(bundle))
        ) {
          const previous = this.equipmentColors
            .get(bundleKey(bundle))
            ?.find((c) => !isSkinColor(c));
          if (previous)
            for (const color of entry.colors.filter((c) => !isSkinColor(c)))
              color.setColors(previous.colors);
        }
        if (bundle.slots.includes('HR'))
          entry.group.traverse((node) => {
            if (!(node instanceof Mesh) || node.morphTargetInfluences?.length !== 1) return;
            captureHairDefault(node);
            const index = hairLengthIndex(sourceName(node));
            const length =
              index === undefined ? undefined : this.hairLengths.get(`${bundle.item.id}:${index}`);
            if (length !== undefined) node.morphTargetInfluences[0] = length;
          });
        this.skinColors?.attach(entry.colors);
      }
      if (!this.alive || request !== this.request)
        throw new Error('Body changed while loading equipment');
    } catch (error) {
      for (const entry of staged) {
        this.skinColors?.detach(entry.colors);
        entry.face?.dispose();
        entry.decal?.dispose();
        entry.effect?.dispose();
        for (const color of entry.colors) color.dispose();
        dispose(entry.group);
      }
      throw error;
    }
    // Hat plus fitted hair, and every garment part, commit in one transaction.
    const evicted = new Set(remove);
    for (const { bundle } of staged)
      for (const old of conflictingItems(this.equippedItems, bundle)) evicted.add(bundleKey(old));
    for (const key of evicted) this.unequip(key);
    for (const {
      bundle,
      group,
      colors,
      face,
      decal,
      effect,
      paletteAnimations,
      placements
    } of staged) {
      const key = bundleKey(bundle);
      if (placements) this.hairPlacements.set(key, placements);
      let fabric = 0;
      for (const color of colors)
        if (!isSkinColor(color)) {
          color.label = `${bundle.item.name}${bundle.hand ? ' • ' + (bundle.hand === 'LH' ? 'Left hand' : 'Right hand') : ''}${fabric++ ? ' • Detail' : ''}`;
          color.paletteId = bundle.item.library?.customize.colorPalette;
        }
      this.equipment.set(key, group);
      this.equipmentColors.set(key, colors);
      if (paletteAnimations) this.paletteAnimations.set(key, paletteAnimations);
      this.bundles.set(key, bundle);
      if (effect) {
        this.cosmeticEffects.set(key, effect);
        this.scene.add(effect.root);
        effect.update(0, this.camera);
      }
      if (face) this.face = face;
      if (decal) {
        this.decal = decal;
        decal.attach();
      }
      for (const [index, asset] of bundle.parts.entries())
        this.equipmentAssets.set(`${key}:${index}`, asset);
      this.scene.add(group);
    }
    this.refreshVisibility();
    this.refreshHatAttachments(true);
    this.renderer.render(this.scene, this.camera);
  }

  unequip(slot: string) {
    this.hairPlacements.delete(slot);
    this.paletteAnimations.delete(slot);
    this.cosmeticEffects.get(slot)?.dispose();
    this.cosmeticEffects.delete(slot);
    if (this.bundles.get(slot)?.slots.includes('FD')) {
      this.decal?.dispose();
      this.decal = undefined;
    }
    if (this.bundles.get(slot)?.slots.includes('FA')) {
      this.face?.dispose();
      this.face = undefined;
    }
    this.skinColors?.detach(this.equipmentColors.get(slot) ?? []);
    for (const color of this.equipmentColors.get(slot) ?? []) color.dispose();
    this.equipmentColors.delete(slot);
    const group = this.equipment.get(slot);
    if (group) {
      this.scene.remove(group);
      dispose(group);
      this.equipment.delete(slot);
    }
    this.bundles.delete(slot);
    for (const key of this.equipmentAssets.keys())
      if (key.startsWith(`${slot}:`)) this.equipmentAssets.delete(key);
    this.refreshVisibility();
  }

  private refreshVisibility() {
    for (const [node, visible] of this.bodyVisibility)
      node.visible = visible && !hidesBodyPart(sourceName(node), this.equipmentAssets.values());
    // Cutting applies to other garments too, for example a top cutting PA_Belt.
    for (const [key, group] of this.equipment) {
      const others = [...this.equipmentAssets.entries()]
        .filter(([part]) => !part.startsWith(`${key}:`))
        .map(([, asset]) => asset);
      group.traverse((node) => {
        if (node instanceof Mesh)
          node.visible = !others.some((asset) =>
            asset.attachment?.cutting.includes(sourceName(node))
          );
      });
    }
  }

  selectClip(name: string) {
    const clip = this.body?.animations.find((entry) => entry.name === name);
    if (!clip || !this.mixer) return;
    this.mixer.stopAllAction();
    this.mixer.clipAction(clip).reset().play();
    this.mixer.update(0);
    this.playing = true;
  }

  screenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  destroy() {
    this.alive = false;
    this.request++;
    this.backgroundRequest++;
    this.background?.dispose();
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.controls.dispose();
    for (const slot of this.equipment.keys()) this.unequip(slot);
    if (this.body) {
      this.defaultFace?.dispose();
      for (const color of this.bodyColors) color.dispose();
      this.mixer?.stopAllAction();
      dispose(this.body.scene);
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
