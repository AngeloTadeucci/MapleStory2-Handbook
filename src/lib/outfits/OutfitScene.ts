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
    for (const group of this.equipment.values())
      for (const mixer of equipmentMixers(group)) mixer.setTime(time);
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
    value: number;
    set: (value: number) => void;
  }[] {
    const controls: {
      label: string;
      values: number[];
      value: number;
      set: (value: number) => void;
    }[] = [];
    for (const [key, bundle] of this.bundles) {
      const scales = bundle.item.library?.hairScales;
      if (!scales?.length) continue;
      this.equipment.get(key)?.traverse((node) => {
        if (!(node instanceof Mesh) || node.morphTargetInfluences?.length !== 1) return;
        const name = sourceName(node),
          index = /^HR(\d+)/.exec(name)?.[1] ?? '0';
        const values = scales[Number(index)];
        if (!values?.length) return;
        controls.push({
          label: `${bundle.item.name} length ${Number(index) + 1}`,
          values,
          value: node.morphTargetInfluences[0],
          set: (value) => {
            if (!values.includes(value)) throw new Error('Unsupported hair length');
            node.morphTargetInfluences![0] = value;
            this.hairLengths.set(`${bundle.item.id}:${name}`, value);
          }
        });
      });
    }
    return controls;
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
    const distance =
      (Math.max(size.y, size.x / this.camera.aspect) /
        (2 * Math.tan((this.camera.fov * Math.PI) / 360))) *
      1.2;
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
        for (const group of this.equipment.values())
          for (const mixer of equipmentMixers(group)) mixer.update(delta);
      }
      (this.face ?? this.defaultFace)?.update(delta);
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
            entry.group.add(shareSkeleton(gear.scene, this.bones, gear.animations));
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
            this.body.scene
          );
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
            const length = this.hairLengths.get(`${bundle.item.id}:${sourceName(node)}`);
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
    for (const { bundle, group, colors, face, decal, effect } of staged) {
      const key = bundleKey(bundle);
      let fabric = 0;
      for (const color of colors)
        if (!isSkinColor(color)) {
          color.label = `${bundle.item.name}${bundle.hand ? ' • ' + (bundle.hand === 'LH' ? 'Left hand' : 'Right hand') : ''}${fabric++ ? ' • Detail' : ''}`;
          color.paletteId = bundle.item.library?.customize.colorPalette;
        }
      this.equipment.set(key, group);
      this.equipmentColors.set(key, colors);
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
    this.renderer.render(this.scene, this.camera);
  }

  unequip(slot: string) {
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
