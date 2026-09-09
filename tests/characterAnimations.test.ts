import { describe, expect, it } from 'vitest';
import { animationGroups, animationLabel } from '../src/lib/outfits/characterAnimations';

describe('character animation menu', () => {
  it('groups only available clips and preserves their playback identifiers', () => {
    const clips = [
      'fitting_idle_a',
      'emotion_hello_a',
      'emotion_dance_a',
      'star_run_a',
      'future_clip'
    ];
    const groups = animationGroups(clips);
    expect(groups.map((group) => group.label)).toEqual(['Everyday', 'Emotes', 'Dances', 'Combat']);
    expect(groups.flatMap((group) => group.clips).sort()).toEqual([...clips].sort());
    expect(animationGroups(['emotion_hello_a'])).toEqual([
      { label: 'Emotes', clips: ['emotion_hello_a'] }
    ]);
    expect(animationGroups([])).toEqual([]);
  });

  it('labels source names without changing their identifiers', () => {
    expect(animationLabel('emotion_hello_a')).toBe('Greet');
    expect(animationLabel('emotion_suprise_a')).toBe('Surprise');
    expect(animationLabel('emotion_dance_a')).toBe('Crazy Dance');
    expect(animationLabel('future_clip')).toBe('Future clip');
  });
});
