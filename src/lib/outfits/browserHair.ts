import { Box3, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { sourceName } from './sharedSkeleton';

const step = 1 / 120;
const gravity = new Vector3(0, -9.8, 0);
const damping = Math.exp(-4 * step);
type Sphere = { center: Vector3; radius: number };

// A lightweight positional chain, intentionally independent of client PhysX limits.
export class HairChain {
  readonly points: Vector3[];
  readonly lengths: number[];
  private previous: Vector3[];
  private anchor: Vector3;
  private remainder = 0;

  constructor(points: Vector3[]) {
    if (points.length < 2 || points.some((p) => !p.toArray().every(Number.isFinite)))
      throw new Error('Invalid hair chain');
    this.points = points.map((p) => p.clone());
    this.previous = points.map((p) => p.clone());
    this.anchor = points[0].clone();
    this.lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]));
    if (this.lengths.some((length) => length < 1e-6)) throw new Error('Empty hair segment');
  }

  advance(delta: number, anchor: Vector3, sphere?: Sphere) {
    if (!Number.isFinite(delta) || delta < 0 || !anchor.toArray().every(Number.isFinite))
      throw new Error('Invalid hair step');
    // Bound catch-up work after tab suspension. Interpolate head movement across substeps.
    this.remainder += Math.min(delta, 0.1);
    const count = Math.floor((this.remainder + 1e-10) / step);
    const from = this.anchor.clone();
    for (let tick = 0; tick < count; tick++) {
      // Carry half the head displacement with the strand. Full inertial transfer
      // makes the exaggerated run bob launch this small chain over the head.
      const carry = anchor
        .clone()
        .sub(from)
        .multiplyScalar(0.5 / count);
      for (let i = 1; i < this.points.length; i++) {
        this.points[i].add(carry);
        this.previous[i].add(carry);
      }
      this.points[0].lerpVectors(from, anchor, (tick + 1) / count);
      for (let i = 1; i < this.points.length; i++) {
        const point = this.points[i];
        const current = point.clone();
        point.addScaledVector(point.clone().sub(this.previous[i]), damping);
        point.addScaledVector(gravity, step * step);
        this.previous[i].copy(current);
        const origin = this.points[i - 1];
        const direction = point.clone().sub(origin).normalize();
        // Limit swing to the downward hemisphere. Head bob can otherwise turn
        // these short, unconstrained pendulums completely over their anchors.
        direction.y = Math.min(direction.y, 0);
        if (direction.lengthSq() < 1e-10) direction.set(0, -1, 0);
        else direction.normalize();
        if (sphere) {
          const toward = sphere.center.clone().sub(origin);
          const distance = toward.length();
          // Limit each link to the sphere's tangent cone, keeping the whole link out.
          if (distance > sphere.radius + 1e-6) {
            toward.divideScalar(distance);
            const dot = direction.dot(toward);
            const sine = sphere.radius / distance;
            const cosine = Math.sqrt(1 - sine * sine);
            const firstHit =
              distance * dot -
              Math.sqrt(Math.max(0, sphere.radius ** 2 - distance ** 2 * (1 - dot ** 2)));
            if (dot > cosine && this.lengths[i - 1] > firstHit) {
              const side = direction.clone().addScaledVector(toward, -dot);
              if (side.lengthSq() < 1e-10) side.crossVectors(toward, new Vector3(0, 0, 1));
              if (side.lengthSq() < 1e-10) side.set(1, 0, 0);
              direction.copy(toward).multiplyScalar(cosine).addScaledVector(side.normalize(), sine);
            }
          }
        }
        point.copy(origin).addScaledVector(direction, this.lengths[i - 1]);
      }
    }
    this.remainder = Math.max(0, this.remainder - count * step);
    if (count) this.anchor.copy(anchor);
  }
}

type Tail = {
  bones: Object3D[];
  rotations: Quaternion[];
  chain?: HairChain;
};

export class BrowserHair {
  private tails: Tail[];
  private head: Object3D;
  private center: Vector3;
  private radius: number;

  constructor(group: Object3D) {
    if (group.children.length !== 3) throw new Error('Browser motion needs both Sassy tails');
    this.tails = group.children.slice(1).map((part) => {
      const found = new Set<Object3D>();
      part.traverse((node) => {
        if (node instanceof SkinnedMesh)
          node.skeleton.bones.forEach((bone) => {
            if (['Bone01', 'Bone02', 'Bone03'].includes(sourceName(bone))) found.add(bone);
          });
      });
      const bones = ['Bone01', 'Bone02', 'Bone03'].map((name) =>
        [...found].find((bone) => sourceName(bone) === name)
      );
      if (found.size !== 3 || bones.some((b) => !b)) throw new Error('Ambiguous Sassy tail chain');
      const chain = bones as Object3D[];
      if (chain[1].parent !== chain[0] || chain[2].parent !== chain[1])
        throw new Error('Unsupported Sassy hierarchy');
      return { bones: chain, rotations: chain.map((b) => b.quaternion.clone()) };
    });
    const head = this.tails[0].bones[0].parent?.parent;
    if (!head || sourceName(head) !== 'Bip01 Head') throw new Error('Missing Sassy head anchor');
    this.head = head;
    const bounds = new Box3().setFromObject(group.children[0], true);
    const size = bounds.getSize(new Vector3());
    this.center = head.worldToLocal(bounds.getCenter(new Vector3()));
    this.radius = Math.min(size.x, size.y, size.z) * 0.45;
  }

  restore() {
    for (const tail of this.tails)
      tail.bones.forEach((bone, i) => {
        bone.quaternion.copy(tail.rotations[i]);
        bone.updateWorldMatrix(true, true);
      });
  }

  update(delta: number, reset = false) {
    this.restore();
    const center = this.head.localToWorld(this.center.clone());
    for (const tail of this.tails) {
      const points = tail.bones.map((b) => b.getWorldPosition(new Vector3()));
      const rotations = tail.bones.map((b) => b.getWorldQuaternion(new Quaternion()));
      // A virtual end continues the final segment so Bone03 also receives a bend.
      points.push(points[2].clone().add(points[2].clone().sub(points[1])));
      if (points[0].distanceTo(points[1]) < 1e-6) continue;
      const sphere = {
        center,
        radius: Math.max(0, Math.min(this.radius, points[0].distanceTo(center) - 0.015))
      };
      if (!tail.chain || reset) {
        tail.chain = new HairChain(points);
        // Start settled instead of making every equip wait for an upright braid to fall.
        for (let i = 0; i < 240; i++) tail.chain.advance(step, points[0], sphere);
      } else tail.chain.advance(delta, points[0], sphere);
      for (let i = 0; i < tail.bones.length; i++) {
        const bone = tail.bones[i];
        const authored = points[i + 1].clone().sub(points[i]).normalize();
        const dynamic = tail.chain.points[i + 1].clone().sub(tail.chain.points[i]).normalize();
        const desired = new Quaternion()
          .setFromUnitVectors(authored, dynamic)
          .multiply(rotations[i]);
        const parent = bone.parent!.getWorldQuaternion(new Quaternion());
        bone.quaternion.copy(parent.invert().multiply(desired));
        bone.updateWorldMatrix(false, true);
      }
    }
  }
}
