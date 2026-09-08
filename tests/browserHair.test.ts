import { describe, expect, it } from 'vitest';
import { Bone, BoxGeometry, Group, Mesh, Quaternion, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { BrowserHair, HairChain } from '../src/lib/outfits/browserHair';

const upwards = () => [new Vector3(), new Vector3(0.04, 0.05, 0), new Vector3(0.12, 0.3, 0)];
describe('approximate browser hair', () => {
  it('settles an upright chain downward without stretching its links', () => {
    const chain = new HairChain(upwards());
    for (let i = 0; i < 600; i++) chain.advance(1 / 120, new Vector3());
    expect(chain.points[2].y).toBeLessThan(-0.3);
    chain.lengths.forEach((length, i) =>
      expect(chain.points[i + 1].distanceTo(chain.points[i])).toBeCloseTo(length, 10)
    );
  });

  it('runs consistently at different frame rates and reacts to a moving anchor', () => {
    const slow = new HairChain(upwards()),
      fast = new HairChain(upwards());
    for (let i = 0; i < 90; i++) slow.advance(1 / 30, new Vector3());
    for (let i = 0; i < 360; i++) fast.advance(1 / 120, new Vector3());
    slow.points.forEach((p, i) => expect(p.distanceTo(fast.points[i])).toBeLessThan(1e-9));
    const before = fast.points[2].clone();
    fast.advance(1 / 60, new Vector3(0.08, 0, 0));
    expect(fast.points[0].x).toBeCloseTo(0.08);
    expect(fast.points[2].clone().sub(before).x).toBeLessThan(0.08);
    fast.advance(30, new Vector3(0.08, 0, 0));
    expect(fast.points.every((p) => p.toArray().every(Number.isFinite))).toBe(true);
    expect(() => fast.advance(NaN, new Vector3())).toThrow('Invalid hair step');
  });

  it('keeps whole segments outside the head sphere, including short links', () => {
    const anchor = new Vector3(0.25, 0.3, 0);
    const chain = new HairChain([
      anchor,
      anchor.clone().add(new Vector3(0.01, 0.045, 0)),
      anchor.clone().add(new Vector3(0.1, 0.3, 0))
    ]);
    const sphere = { center: new Vector3(), radius: 0.3 };
    for (let i = 0; i < 600; i++) {
      chain.advance(1 / 120, anchor, sphere);
      for (let j = 0; j < chain.lengths.length; j++) {
        const start = chain.points[j],
          end = chain.points[j + 1];
        const edge = end.clone().sub(start);
        const t = Math.max(0, Math.min(1, -start.dot(edge) / edge.lengthSq()));
        expect(start.clone().addScaledVector(edge, t).length()).toBeGreaterThanOrEqual(0.3 - 1e-8);
      }
    }
  });

  it('does not fold above the anchor under exaggerated running head bob', () => {
    const initial = [
      new Vector3(0.32, 1.4, 0),
      new Vector3(0.35, 1.37, 0),
      new Vector3(0.37, 1.15, 0)
    ];
    const chain = new HairChain(initial);
    for (let i = 0; i < 1200; i++) {
      const anchor = new Vector3(0.32, 1.4 + 0.15 * Math.sin((i / 120) * 2 * Math.PI * 3), 0);
      chain.advance(1 / 120, anchor, { center: new Vector3(0, anchor.y - 0.2, 0), radius: 0.28 });
      expect(chain.points[2].y).toBeLessThanOrEqual(anchor.y + 1e-6);
    }
  });

  it('rotates both tails beneath a transformed head and restores exact authored transforms', () => {
    const world = new Group(),
      head = new Bone(),
      group = new Group();
    world.scale.setScalar(0.01);
    world.rotation.x = -Math.PI / 2;
    world.add(head, group);
    head.name = 'Bip01 Head';
    head.position.set(0, 0, 100);
    const base = new Mesh(new BoxGeometry(60, 60, 60));
    base.position.copy(head.position);
    group.add(base);
    const tails: Bone[][] = [];
    for (const sign of [-1, 1]) {
      const point = new Bone();
      point.name = 'Point01';
      point.position.set(sign * 35, 0, 20);
      head.add(point);
      const bones = [1, 2, 3].map((id) => {
        const bone = new Bone();
        bone.name = `Bone0${id}`;
        return bone;
      });
      point.add(bones[0]);
      bones[0].add(bones[1]);
      bones[1].add(bones[2]);
      bones[1].position.set(4.4, 0, 0);
      bones[2].position.set(22.6, 0, 0);
      const part = new Group(),
        mesh = new SkinnedMesh();
      mesh.bind(new Skeleton(bones));
      part.add(mesh);
      group.add(part);
      tails.push(bones);
    }
    world.updateMatrixWorld(true);
    const before = tails.flat().map((b) => ({
      position: b.position.toArray(),
      rotation: b.quaternion.toArray(),
      scale: b.scale.toArray()
    }));
    const rootPositions = tails.map((b) => b[0].getWorldPosition(new Vector3()));
    const motion = new BrowserHair(group);
    motion.update(0, true);
    for (const [i, bones] of tails.entries()) {
      const root = bones[0].getWorldPosition(new Vector3());
      expect(root.distanceTo(rootPositions[i])).toBeLessThan(1e-9);
      expect(bones[2].getWorldPosition(new Vector3()).y).toBeLessThan(root.y - 0.2);
      for (const bone of bones)
        expect(bone.getWorldQuaternion(new Quaternion()).length()).toBeCloseTo(1);
    }
    motion.restore();
    expect(
      tails.flat().map((b) => ({
        position: b.position.toArray(),
        rotation: b.quaternion.toArray(),
        scale: b.scale.toArray()
      }))
    ).toEqual(before);
  });
});
