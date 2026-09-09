import { AnimationAction, AnimationClip, AnimationMixer, Object3D } from 'three';

export class ModelPlayback {
  readonly mixer: AnimationMixer;
  private action?: AnimationAction;
  private selected = '';
  playing = true;
  speed = 1;

  constructor(
    readonly root: Object3D,
    readonly clips: AnimationClip[]
  ) {
    if (new Set(clips.map((clip) => clip.name)).size !== clips.length)
      throw new Error('Model contains duplicate animation names');
    this.mixer = new AnimationMixer(root);
  }

  get name() {
    return this.selected;
  }
  get duration() {
    return this.action?.getClip().duration ?? 0;
  }
  get time() {
    return this.action?.time ?? 0;
  }

  select(name: string): void {
    if (name === this.selected) return;
    const clip = name ? this.clips.find((candidate) => candidate.name === name) : undefined;
    if (name && !clip) throw new Error(`Unknown animation: ${name}`);
    this.mixer.stopAllAction();
    this.selected = name;
    this.action = clip ? this.mixer.clipAction(clip).reset().play() : undefined;
    this.mixer.update(0);
  }

  seek(time: number): void {
    if (!Number.isFinite(time)) throw new Error('Animation time must be finite');
    if (this.action) this.action.time = Math.max(0, Math.min(time, this.duration));
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
  }

  update(delta: number): void {
    if (this.playing) this.mixer.update(delta * this.speed);
  }

  beginCapture(): () => void {
    const name = this.name,
      time = this.time,
      playing = this.playing,
      speed = this.speed;
    this.playing = false;
    return () => {
      this.select(name);
      this.speed = speed;
      this.seek(time);
      this.playing = playing;
    };
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
