// Emote names come from client skillname.xml, joined through skill emotion IDs
// and emotion/common/{female,male}custom.xml. See character-animation-names.json
// in the backend diagnostics for the source IDs. Locomotion has no emote name.
const labels: Record<string, string> = {
  idle_a: 'Idle',
  fitting_idle_a: 'Fitting room',
  walk_a: 'Walk',
  run_a: 'Run',
  star_attack_idle_a: 'Throwing star stance',
  star_run_a: 'Throwing star run',
  emotion_angry_a: 'Anger',
  emotion_happy_a: 'Like',
  emotion_calm_a: "Don't Ask Me",
  emotion_rest_idle_a: 'Dreamy',
  emotion_hello_a: 'Greet',
  emotion_laugh_a: 'Mock',
  emotion_dance_a: 'Crazy Dance',
  emotion_sleep_idle_a: 'Sleep',
  emotion_dance_b: 'Para Para Dance',
  emotion_suprise_a: 'Surprise',
  emotion_refusal_a: 'Reject',
  emotion_provoke_a: 'Taunt',
  emotion_sulk_a: 'Sulk',
  emotion_handkiss_a: 'Blow Kiss',
  emotion_dance_c: 'Tap Dance',
  emotion_dance_d: 'Shimmy',
  emotion_cry_a: 'Cry',
  sit_ground_idle_a: 'Sit',
  emotion_eureka_a: 'Epiphany',
  emotion_think_a: 'Worry',
  emotion_point_a: 'Big Meanie',
  emotion_dance_e: 'Wave Dance',
  emotion_dance_f: 'Spin Dance',
  emotion_dance_g: 'Bunny Dance',
  emotion_dance_h: 'Shuffle Dance',
  emotion_bow_a: 'Kowtow',
  emotion_yeah_a: 'High Five',
  emotion_dance_t: 'Hop Shuffle Boogie',
  emotion_cheer01_a: 'Cheer Up',
  emotion_dance_v: 'Monkey Dance',
  emotion_gymnastics_a: 'Warm Up',
  emotion_clapping_a: 'Applause',
  emotion_happy_b: 'Shall We Fly?',
  emotion_choice_a: 'Dynamic Pose'
};

export function animationLabel(name: string): string {
  return (
    labels[name] ??
    name
      .replace(/^emotion_/, '')
      .replaceAll('_', ' ')
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export function animationGroups(clips: string[]) {
  const groups = ['Everyday', 'Emotes', 'Dances', 'Combat'] as const;
  return groups
    .map((label) => ({
      label,
      clips: clips.filter((name) => {
        const group = name.startsWith('emotion_dance_')
          ? 'Dances'
          : name.startsWith('star_')
            ? 'Combat'
            : name.startsWith('emotion_')
              ? 'Emotes'
              : 'Everyday';
        return group === label;
      })
    }))
    .filter((group) => group.clips.length);
}
