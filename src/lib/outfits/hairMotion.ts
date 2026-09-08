import { Matrix4, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { z } from 'zod';
import type { OutfitScene } from './OutfitScene';
import { sourceName } from './sharedSkeleton';

const pose = z
  .tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite()
  ])
  .refine(
    (p) => Math.abs(p.slice(3).reduce((sum, v) => sum + v * v, 0) - 1) < 0.0001,
    'Motion quaternion must be normalized'
  );
const tail = z.tuple([pose, pose, pose]);
export const hairMotionSchema = z
  .object({
    version: z.literal(1),
    itemId: z.literal(10200010),
    bodyVariant: z.literal('female'),
    clip: z.literal('fitting_idle_a'),
    placements: z.tuple([z.literal(0), z.literal(0)]),
    scale: z.literal(1),
    dt: z.number().min(0.001).max(0.1),
    duration: z.number().positive().max(30),
    clientCoreVerified: z.literal(true),
    clientSceneParity: z.literal(false),
    sourceSha256: z.literal('2f10b2d4a9d8a0c43f0d30cbabd363c49089dbeccddf2e95b3f2273db807acdd'),
    frames: z
      .array(z.tuple([tail, tail]))
      .min(2)
      .max(1801),
    limitations: z.array(z.string()).min(1)
  })
  .refine(
    (s) => Math.abs(s.duration - (s.frames.length - 1) * s.dt) < 0.0001,
    'Motion duration must match its frame count'
  );
export type HairMotionSample = z.infer<typeof hairMotionSchema>;

export function sampleHairMotion(sample: HairMotionSample, time: number) {
  if (!Number.isFinite(time)) throw new Error('Invalid motion time');
  const frame = Math.max(0, Math.min(time / sample.dt, sample.frames.length - 1));
  const lower = Math.floor(frame),
    upper = Math.min(lower + 1, sample.frames.length - 1);
  const amount = frame - lower;
  return sample.frames[lower].map((bones, t) =>
    bones.map((a, b) => {
      const next = sample.frames[upper][t][b];
      return {
        position: new Vector3(...(a.slice(0, 3) as [number, number, number])).lerp(
          new Vector3(...(next.slice(0, 3) as [number, number, number])),
          amount
        ),
        rotation: new Quaternion(...(a.slice(3) as [number, number, number, number])).slerp(
          new Quaternion(...(next.slice(3) as [number, number, number, number])),
          amount
        )
      };
    })
  );
}

export class HairMotionPlayback {
  private tails: Object3D[][];
  private saved: { bone: Object3D; position: Vector3; rotation: Quaternion; scale: Vector3 }[];
  private signature: string;
  private frame = 0;
  private running = false;
  private elapsed = 0;

  constructor(
    private viewer: OutfitScene,
    private sample: HairMotionSample,
    private finished: (reason: string) => void
  ) {
    const bundle = viewer.equippedItems.find((b) => b.item.id === 10200010);
    const group = viewer.equipmentRoot('10200010');
    if (
      !bundle ||
      viewer.browserHairEnabled ||
      !group ||
      group.children.length !== 3 ||
      viewer.equippedItems.some((b) => b.slots.includes('CP')) ||
      viewer.hairPlacementControls.length !== 2 ||
      viewer.hairPlacementControls.some((c) => c.value !== 0 || Math.abs(c.scale - 1) > 0.000001)
    )
      throw new Error(
        'This sample needs browser hair motion off, Sassy position 1 on both tails, size 1, and no hat.'
      );
    this.signature = this.currentSignature();
    this.tails = group.children.slice(1).map((part) => {
      const found = new Set<Object3D>();
      part.traverse((node) => {
        if (node instanceof SkinnedMesh)
          for (const bone of node.skeleton.bones)
            if (['Bone01', 'Bone02', 'Bone03'].includes(sourceName(bone))) found.add(bone);
      });
      const bones = ['Bone01', 'Bone02', 'Bone03'].map((name) =>
        [...found].find((bone) => sourceName(bone) === name)
      );
      if (found.size !== 3 || bones.some((bone) => !bone))
        throw new Error('Ambiguous Sassy skeleton');
      return bones as Object3D[];
    });
    this.saved = this.tails.flatMap((bones) =>
      bones.slice(1).map((bone) => ({
        bone,
        position: bone.position.clone(),
        rotation: bone.quaternion.clone(),
        scale: bone.scale.clone()
      }))
    );
  }

  private currentSignature() {
    return JSON.stringify({
      items: this.viewer.equippedItems.map((b) => b.parts.map((p) => p.id)),
      placements: this.viewer.hairPlacementControls.map((c) => [c.value, c.scale])
    });
  }

  seek(time: number) {
    this.viewer.seek(time);
    const values = sampleHairMotion(this.sample, time);
    for (const [t, bones] of this.tails.entries()) {
      for (let b = 1; b < bones.length; b++) {
        const bone = bones[b];
        bone.parent!.updateWorldMatrix(true, false);
        const desired = new Matrix4().compose(
          values[t][b].position,
          values[t][b].rotation,
          new Vector3(0.01, 0.01, 0.01)
        );
        const local = bone.parent!.matrixWorld.clone().invert().multiply(desired);
        local.decompose(bone.position, bone.quaternion, bone.scale);
        bone.updateWorldMatrix(false, true);
      }
    }
    this.viewer.renderFrame();
  }

  start() {
    this.viewer.selectClip(this.sample.clip);
    this.seek(0);
    this.running = true;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (!this.running) return;
      if (this.currentSignature() !== this.signature || this.viewer.playing) {
        this.stop('Motion sample stopped because the outfit or controls changed.');
        return;
      }
      this.elapsed += previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.1);
      previous = now;
      this.seek(Math.min(this.elapsed, this.sample.duration));
      if (this.elapsed >= this.sample.duration) {
        this.stop('Sample finished. Rest pose restored.');
        return;
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(reason = 'Rest pose restored.') {
    this.running = false;
    cancelAnimationFrame(this.frame);
    for (const { bone, position, rotation, scale } of this.saved) {
      bone.position.copy(position);
      bone.quaternion.copy(rotation);
      bone.scale.copy(scale);
      bone.updateWorldMatrix(true, true);
    }
    this.finished(reason);
  }
}
