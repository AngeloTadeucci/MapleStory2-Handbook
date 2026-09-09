import type { Rgb } from './materialColors';

export const starterOutfit: { id: number; colors?: Rgb[]; dye?: string }[] = [
  // Innocent Face with Guardian Blue dye.
  { id: 10300004, dye: 'dye:4' },
  // Bubbly Wave Locks, Pure Ribbon Frill Dress, Pretty Ribbon Wedding Pumps.
  {
    id: 10200006,
    colors: [
      [0.42, 0.25, 0.16],
      [0.42, 0.25, 0.16],
      [0.42, 0.25, 0.16]
    ]
  },
  {
    id: 12200272,
    colors: [
      [0.58, 0.73, 0.82],
      [0.95, 0.94, 0.88],
      [0.85, 0.88, 0.94]
    ]
  },
  {
    id: 11700467,
    colors: [
      [0.95, 0.94, 0.88],
      [0.58, 0.73, 0.82],
      [0.85, 0.88, 0.94]
    ]
  }
];
