import { describe, expect, it } from 'vitest';
import {
  AnimationClip,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  VectorKeyframeTrack
} from 'three';
import { ModelPlayback } from '../src/lib/models/ModelPlayback';
import { visibleModelBounds } from '../src/lib/models/rendering';

function playback() {
  const root = new Object3D();
  return new ModelPlayback(root, [
    new AnimationClip('walk', 2, [
      new VectorKeyframeTrack('.position', [0, 2], [0, 0, 0, 2, 0, 0])
    ]),
    new AnimationClip('idle', 1, [new VectorKeyframeTrack('.position', [0, 1], [3, 0, 0, 3, 0, 0])])
  ]);
}

describe('standalone model playback', () => {
  it('switches clips on the same scene and seeks to zero while paused', () => {
    const player = playback();
    player.select('walk');
    player.playing = false;
    player.seek(1);
    expect(player.root.position.x).toBeCloseTo(1);
    player.seek(0);
    expect(player.root.position.x).toBeCloseTo(0);
    player.select('idle');
    expect(player.duration).toBe(1);
    expect(player.root.position.x).toBeCloseTo(3);
    expect(() => player.select('missing')).toThrow('Unknown animation');
    expect(player.name).toBe('idle');
  });
  it('restores clip, time, pause state and speed after capture', () => {
    const player = playback();
    player.select('walk');
    player.seek(0.75);
    player.speed = 2;
    const restore = player.beginCapture();
    player.update(0.5);
    expect(player.time).toBeCloseTo(0.75);
    player.select('idle');
    player.seek(0.2);
    player.speed = 4;
    restore();
    expect(player.name).toBe('walk');
    expect(player.time).toBeCloseTo(0.75);
    expect(player.root.position.x).toBeCloseTo(0.75);
    expect(player.playing).toBe(true);
    expect(player.speed).toBe(2);
  });
  it('frames visible geometry without distant hidden geometry or skeleton helpers', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    root.add(mesh);
    const hidden = mesh.clone();
    hidden.position.set(1000, 1000, 1000);
    hidden.visible = false;
    root.add(hidden);
    const helper = new Object3D();
    helper.position.set(-1000, -1000, -1000);
    root.add(helper);
    const bounds = visibleModelBounds(root);
    expect(bounds.min.toArray()).toEqual([-1, -1, -1]);
    expect(bounds.max.toArray()).toEqual([1, 1, 1]);
  });
});
