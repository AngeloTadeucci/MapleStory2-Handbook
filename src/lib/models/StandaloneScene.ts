import { Mesh, PerspectiveCamera, Scene, Texture, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ColorControl } from '$lib/outfits/materialColors';
import type { GifCaptureSource } from '$lib/gifCapture';
import { addModelLighting, prepareModelMaterials, visibleModelBounds } from './rendering';
import { ModelPlayback } from './ModelPlayback';
import { FaceAnimation, customizationSchema } from '$lib/outfits/faceAnimation';

export class StandaloneScene {
  private scene = new Scene();
  private camera = new PerspectiveCamera(35, 1, 0.001, 2000);
  private renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private gltf?: GLTF;
  private colors: ColorControl[] = [];
  private playback?: ModelPlayback;
  private face?: FaceAnimation;
  private disposed = false;
  private frame = 0;
  private previous = 0;

  constructor(private element: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearAlpha(0);
    element.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'pan-y';
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    addModelLighting(this.scene);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(element);
    this.resize();
    const animate = (time: number) => {
      if (this.disposed) return;
      const delta = this.previous ? Math.min((time - this.previous) / 1000, 0.1) : 0;
      this.playback?.update(delta);
      this.previous = time;
      this.face?.update(
        this.playback?.playing ? delta * this.playback.speed : 0,
        this.playback?.duration ? this.playback.time : undefined
      );
      this.render();
      this.frame = requestAnimationFrame(animate);
    };
    this.frame = requestAnimationFrame(animate);
  }

  async load(url: string, face?: { preset: string; customizationUrl: string }): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    if (this.disposed) {
      this.disposeGltf(gltf);
      return;
    }
    try {
      this.colors = await prepareModelMaterials(gltf);
      if (face) {
        const response = await fetch(face.customizationUrl);
        if (!response.ok) throw new Error('Model customization is unavailable');
        const customization = customizationSchema.parse(await response.json());
        const preset = customization.faces[face.preset];
        const palette = customization.palettes['3']?.[0];
        if (!preset || !palette) throw new Error('Model face preset is unavailable');
        this.face = await FaceAnimation.load(
          preset,
          palette.colors,
          new URL('.', face.customizationUrl).href
        );
        this.face.attach(gltf.scene);
      }
    } catch (error) {
      this.face?.dispose();
      this.colors.forEach((control) => control.dispose());
      this.disposeGltf(gltf);
      throw error;
    }
    if (this.disposed) {
      this.face?.dispose();
      this.colors.forEach((control) => control.dispose());
      this.disposeGltf(gltf);
      return;
    }
    this.gltf = gltf;
    this.playback = new ModelPlayback(gltf.scene, gltf.animations);
    this.scene.add(gltf.scene);
    this.animationName =
      gltf.animations.find((clip) => clip.name.toLowerCase() === 'idle_a')?.name ??
      gltf.animations[0]?.name ??
      '';
    const bounds = visibleModelBounds(gltf.scene);
    if (bounds.isEmpty()) throw new Error('Model has no visible geometry');
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const vertical = (this.camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect);
    const distance =
      Math.max(size.y / Math.tan(vertical / 2), size.x / Math.tan(horizontal / 2)) * 0.6 + size.z;
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(new Vector3(0, 0, Math.max(distance, 0.01)));
    this.camera.far = Math.max(2000, distance * 10);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.render();
  }

  get availableAnimations(): string[] {
    return this.gltf?.animations.map((clip) => clip.name) ?? [];
  }
  get animationName(): string {
    return this.playback?.name ?? '';
  }
  set animationName(name: string) {
    this.playback?.select(name);
    this.face?.selectClip(name, 0);
    this.render();
  }
  get currentTime(): number {
    return this.playback?.time ?? 0;
  }
  set currentTime(time: number) {
    this.playback?.seek(time);
    this.face?.seek(time);
    this.render();
  }
  get duration(): number {
    return this.playback?.duration ?? 0;
  }
  get timeScale(): number {
    return this.playback?.speed ?? 1;
  }
  set timeScale(speed: number) {
    if (!Number.isFinite(speed) || speed <= 0) throw new Error('Animation speed must be positive');
    if (this.playback) this.playback.speed = speed;
  }
  get offsetWidth(): number {
    return this.element.clientWidth;
  }
  get offsetHeight(): number {
    return this.element.clientHeight;
  }
  play(): void {
    if (this.playback) this.playback.playing = true;
  }
  pause(): void {
    if (this.playback) this.playback.playing = false;
  }
  toDataURL(): string {
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }
  captureSource(): GifCaptureSource {
    return {
      width: this.offsetWidth,
      height: this.offsetHeight,
      duration: this.duration,
      begin: () => {
        const restore = this.playback?.beginCapture();
        return () => {
          restore?.();
          this.face?.seek(this.currentTime);
          this.render();
        };
      },
      frame: (time) => {
        this.currentTime = time;
        return this.toDataURL();
      }
    };
  }
  private resize(): void {
    const width = Math.max(1, this.offsetWidth),
      height = Math.max(1, this.offsetHeight);
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  private render(): void {
    if (!this.disposed) this.renderer.render(this.scene, this.camera);
  }
  private disposeGltf(gltf: GLTF): void {
    const textures = new Set<Texture>();
    gltf.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry.dispose();
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        for (const value of Object.values(material))
          if (value instanceof Texture) textures.add(value);
        material.dispose();
      }
    });
    textures.forEach((texture) => texture.dispose());
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.playback?.dispose();
    this.face?.dispose();
    this.colors.forEach((control) => control.dispose());
    if (this.gltf) this.disposeGltf(this.gltf);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
