import { describe, expect, it } from 'vitest';
import {
  AnimationClip,
  BoxGeometry,
  Group,
  InterpolateDiscrete,
  Mesh,
  MeshStandardMaterial,
  VectorKeyframeTrack
} from 'three';
import { materialAnimationTracks } from '../src/lib/models/materialTracks';
import { ModelPlayback } from '../src/lib/models/ModelPlayback';
import { visibleModelBounds } from '../src/lib/models/rendering';

function effect(x: number, material = new MeshStandardMaterial({ transparent: true, opacity: 0 })) {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
  mesh.position.x = x;
  return mesh;
}

function clip(name: string, userData: Record<string, unknown> = {}) {
  const result = new AnimationClip(name, 2, [
    new VectorKeyframeTrack('.position', [0, 2], [0, 0, 0, 0, 0, 0])
  ]);
  result.userData = userData;
  return result;
}

const fade = {
  node: 'Editable Poly@#5',
  property: 'alpha',
  materials: [4],
  times: [0, 1, 2],
  values: [-0.06, 1.1, 0],
  interpolation: 'LINEAR'
};

describe('source material alpha tracks', () => {
  it('fades every mesh sharing the animated material and restores rest alpha on clip change', () => {
    const root = new Group();
    const body = effect(0, new MeshStandardMaterial());
    const shared = new MeshStandardMaterial({ transparent: true, opacity: 0 });
    const first = effect(1, shared),
      second = effect(2, shared.clone());
    root.add(body, first, second);
    const grow = clip('Grow_A', { nifMaterialTracks: [fade] });
    grow.tracks.push(...materialAnimationTracks(grow, new Map([[4, [first, second]]])));
    const player = new ModelPlayback(root, [grow, clip('Idle_A')]);
    player.select('Grow_A');
    player.playing = false;
    player.seek(0);
    expect(first.material.opacity).toBe(0);
    player.seek(1);
    expect(first.material.opacity).toBe(1);
    expect(second.material.opacity).toBe(1);
    player.seek(0.5);
    expect(first.material.opacity).toBeCloseTo(0.5);
    player.select('Idle_A');
    expect(first.material.opacity).toBe(0);
    expect(second.material.opacity).toBe(0);
    expect(body.material.opacity).toBe(1);
  });

  it('uses step interpolation and ignores clips without material tracks', () => {
    const mesh = effect(0);
    const tracks = materialAnimationTracks(
      clip('Gift_A', { nifMaterialTracks: [{ ...fade, interpolation: 'STEP' }] }),
      new Map([[4, [mesh]]])
    );
    expect(tracks).toHaveLength(1);
    expect(tracks[0].getInterpolation()).toBe(InterpolateDiscrete);
    expect(materialAnimationTracks(clip('Idle_A'), new Map())).toEqual([]);
  });

  it('rejects tracks for materials the scene does not contain', () => {
    expect(() =>
      materialAnimationTracks(clip('Eat_A', { nifMaterialTracks: [fade] }), new Map())
    ).toThrow('missing material 4');
    expect(() =>
      materialAnimationTracks(
        clip('Eat_A', { nifMaterialTracks: [{ ...fade, values: [0] }] }),
        new Map([[4, [effect(0)]]])
      )
    ).toThrow('mismatched keys');
  });

  it('frames the model without fully transparent effect geometry', () => {
    const root = new Group();
    root.add(effect(0, new MeshStandardMaterial()), effect(50));
    const bounds = visibleModelBounds(root);
    expect(bounds.max.x).toBeCloseTo(0.5);
  });
});
