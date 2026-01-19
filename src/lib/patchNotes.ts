export interface PatchNote {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed';
    description: string;
  }[];
}

export const patchNotes: PatchNote[] = [
  {
    version: '1.6.0',
    date: '2026-01-19',
    title: '2026 Site Rework',
    changes: [
      { type: 'added', description: 'About page with project information and support links' },
      { type: 'added', description: 'Patch notes system on homepage and dedicated page' }
    ]
  },
  {
    version: '1.5.0',
    date: '2025-07-25',
    title: 'Search Improvements',
    changes: [
      { type: 'added', description: 'New filters for item search' }
    ]
  },
  {
    version: '1.4.0',
    date: '2025-03-05',
    title: 'Accessories Update',
    changes: [
      { type: 'added', description: 'Face & Eye accessories category' },
      { type: 'added', description: 'Search by item categories' }
    ]
  },
  {
    version: '1.3.0',
    date: '2024-09-14',
    title: 'Trophies & Dyes',
    changes: [
      { type: 'added', description: 'Complete trophies system with search and filtering' },
      { type: 'added', description: 'Dyes list with trophy sources' }
    ]
  },
  {
    version: '1.2.0',
    date: '2024-07-16',
    title: 'Major Content Update',
    changes: [
      { type: 'added', description: 'Story Books section with full text content' },
      { type: 'added', description: 'NPC stats display' },
      { type: 'added', description: 'Quests system' },
      { type: 'added', description: 'Maps section with images' },
      { type: 'added', description: 'Outfit icon indicators on items' }
    ]
  },
  {
    version: '1.1.0',
    date: '2023-05-14',
    title: 'Skeleton UI Redesign',
    changes: [
      { type: 'changed', description: 'Complete UI redesign using Skeleton UI' },
      { type: 'added', description: 'Mobile-friendly 3D model viewer' },
      { type: 'added', description: 'GIF creation from 3D model animations' }
    ]
  },
  {
    version: '1.0.0',
    date: '2023-01-23',
    title: 'Initial Public Release',
    changes: [
      { type: 'added', description: 'Launched MapleStory 2 Handbook with Items and NPCs database' },
      { type: 'added', description: '3D model viewer for items and NPCs' },
      { type: 'added', description: 'Item box contents display' },
      { type: 'added', description: 'Search with infinite scroll' },
      { type: 'added', description: 'View counter and Most Viewed sections' }
    ]
  }
  // Add new patch notes at the top of this array
];

export function getRecentPatchNotes(count: number = 3): PatchNote[] {
  return patchNotes.slice(0, count);
}

export function getChangeTypeColor(type: PatchNote['changes'][0]['type']): string {
  switch (type) {
    case 'added':
      return 'text-green-400';
    case 'changed':
      return 'text-yellow-400';
    case 'fixed':
      return 'text-blue-400';
    case 'removed':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export function getChangeTypeLabel(type: PatchNote['changes'][0]['type']): string {
  switch (type) {
    case 'added':
      return 'Added';
    case 'changed':
      return 'Changed';
    case 'fixed':
      return 'Fixed';
    case 'removed':
      return 'Removed';
    default:
      return type;
  }
}
