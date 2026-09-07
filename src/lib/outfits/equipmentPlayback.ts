/** Prefer the source idle sequence. An ambiguous multi-clip default stays unavailable. */
export function defaultEquipmentClip(names: string[]): string | undefined {
  if (names.length <= 1) return names[0];
  const exact = names.filter((name) => name.toLowerCase() === 'idle_a');
  if (exact.length === 1) return exact[0];
  const named = names.filter(
    (name) => /_idle_a$/i.test(name) && !/(^|_)attack_idle_a$/i.test(name)
  );
  if (named.length === 1) return named[0];
  throw new Error('Equipment has no unambiguous source idle animation');
}
