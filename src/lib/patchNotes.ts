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
    version: '1.11.0',
    date: '2026-08-08',
    title: 'KMS2 Data Update',
    changes: [
      { type: 'changed', description: 'Rebuilt the entire database from the latest KMS2 client data' },
      { type: 'added', description: 'Added 555 new 3D models, along with their animations' },
      { type: 'fixed', description: 'NPC animations that failed to load because the animation was stored under a different name' },
      { type: 'fixed', description: 'NPC portraits that pointed at an image that was never shipped, such as Blue Rook and Della Rosa' }
    ]
  },
  {
    version: '1.10.0',
    date: '2026-04-28',
    title: 'Item Drops',
    changes: [
      { type: 'added', description: 'Item pages now show which NPCs drop the item, and NPC pages now list their item drops' },
      { type: 'changed', description: 'Drop lists now use a cleaner compact layout with item names, quantities, and drop type details when relevant' },
      { type: 'added', description: 'Added quest requirement and reward links to item, NPC, and quest pages' }
    ]
  },
  {
    version: '1.9.0',
    date: '2026-04-27',
    title: 'Housing Catalog',
    changes: [
      { type: 'added', description: 'Housing catalog with search, category, currency, buyable filters, and pagination' },
      { type: 'added', description: 'Housing item details with category, price, buyable state, and trophy requirements' },
      { type: 'added', description: 'Housing navigation entry with responsive overflow menu support' }
    ]
  },
  {
    version: '1.8.0',
    date: '2026-04-02',
    title: 'Soundtrack Player',
    changes: [
      { type: 'added', description: 'Soundtrack page with 289 BGM tracks from the game' },
      { type: 'added', description: 'Floating music player with play/pause, skip, shuffle, loop, and volume controls' },
      { type: 'changed', description: 'Map detail pages now hide the NPCs, Mobs, Portals, and Quests grid when all sections are empty' }
    ]
  },
  {
    version: '1.7.0',
    date: '2026-06-23',
    title: 'New Features & Improvements',
    changes: [
      { type: 'added', description: 'Added map details with Npcs, Mobs, Portals and Quests' },
      { type: 'added', description: 'Added cross references between Npcs, Mobs, Portals and Quests' },
      { type: 'added', description: 'Added maps where mobs can be found outside of the main habitat' },
      { type: 'added', description: 'Added filters for Npcs and Quests search page'},
      { type: 'fixed', description: 'Dropdowns without a max height' },
      { type: 'fixed', description: 'All mobile layout issues' }
    ]
  },
  {
    version: '1.6.0',
    date: '2026-01-19',
    title: '2026 Site Rework',
    changes: [
      { type: 'added', description: 'About page with project information and support links' },
      { type: 'added', description: 'Patch notes system on homepage and dedicated page' },
      { type: 'changed', description: 'Updated site dependencies and performance improvements' }
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
