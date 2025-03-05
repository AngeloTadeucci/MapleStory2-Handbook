export interface ItemTypeDefinition {
  key: string; // Internal key used in API calls
  displayName: string; // Human-readable name for UI
  group: number; // Item Group value
  type: number | number[]; // Item Type value(s)
  category?: string; // Optional category for grouping in UI
}

// Main configuration object for all item types
export const ItemTypes: Record<string, ItemTypeDefinition> = {
  // Appearance items
  // skin: {
  //   key: 'skin',
  //   displayName: 'Skin',
  //   group: 0,
  //   type: 0,
  //   category: 'Appearance'
  // },
  hair: {
    key: 'hair',
    displayName: 'Hair',
    group: 1,
    type: 2,
    category: 'Appearance'
  },
  // face: {
  //   key: 'face',
  //   displayName: 'Face',
  //   group: 0,
  //   type: 3,
  //   category: 'Appearance'
  // },
  // decal: {
  //   key: 'decal',
  //   displayName: 'Decal',
  //   group: 0,
  //   type: 4,
  //   category: 'Appearance'
  // },
  // ear: {
  //   key: 'ear',
  //   displayName: 'Ear',
  //   group: 0,
  //   type: 5,
  //   category: 'Appearance'
  // },

  // Armor items
  // armor: {
  //   key: 'armor',
  //   displayName: 'Armor (All)',
  //   group: 1,
  //   type: [13, 14, 15, 16, 17, 22],
  //   category: 'Equipment'
  // },
  hat: {
    key: 'hat',
    displayName: 'Hat',
    group: 1,
    type: 13,
    category: 'Armor'
  },
  clothes: {
    key: 'clothes',
    displayName: 'Top',
    group: 1,
    type: 14,
    category: 'Armor'
  },
  pants: {
    key: 'pants',
    displayName: 'Bottom',
    group: 1,
    type: 15,
    category: 'Armor'
  },
  gloves: {
    key: 'gloves',
    displayName: 'Gloves',
    group: 1,
    type: 16,
    category: 'Armor'
  },
  shoes: {
    key: 'shoes',
    displayName: 'Shoes',
    group: 1,
    type: 17,
    category: 'Armor'
  },
  overall: {
    key: 'overall',
    displayName: 'Overall',
    group: 1,
    type: 22,
    category: 'Armor'
  },

  // Accessories
  // accessory: {
  //   key: 'accessory',
  //   displayName: 'Accessory (All)',
  //   group: 1,
  //   type: [12, 18, 19, 20, 21],
  //   category: 'Equipment'
  // },
  face: {
    key: 'face',
    displayName: 'Face Accessory',
    group: 1,
    type: 10,
    category: 'Accessory'
  },
  eyewear: {
    key: 'eyewear',
    displayName: 'Eyewear',
    group: 1,
    type: 11,
    category: 'Accessory'
  },
  earring: {
    key: 'earring',
    displayName: 'Earring',
    group: 1,
    type: 12,
    category: 'Accessory'
  },
  cape: {
    key: 'cape',
    displayName: 'Cape',
    group: 1,
    type: 18,
    category: 'Accessory'
  },
  necklace: {
    key: 'necklace',
    displayName: 'Necklace',
    group: 1,
    type: 19,
    category: 'Accessory'
  },
  ring: {
    key: 'ring',
    displayName: 'Ring',
    group: 1,
    type: 20,
    category: 'Accessory'
  },
  belt: {
    key: 'belt',
    displayName: 'Belt',
    group: 1,
    type: 21,
    category: 'Accessory'
  },

  // Weapon categories
  // weapon: {
  //   key: 'weapon',
  //   displayName: 'Weapon (All)',
  //   group: 1,
  //   type: [
  //     [30, 39],
  //     [40, 49],
  //     [50, 59]
  //   ],
  //   category: 'Equipment'
  // },
  // onehandweapon: {
  //   key: 'onehandweapon',
  //   displayName: 'One-Hand Weapons',
  //   group: 1,
  //   type: [30, 31, 32, 33, 34],
  //   category: 'Weapon'
  // },
  // offhandweapon: {
  //   key: 'offhandweapon',
  //   displayName: 'Off-Hand Weapons',
  //   group: 1,
  //   type: [40, 41],
  //   category: 'Weapon'
  // },
  // twohandweapon: {
  //   key: 'twohandweapon',
  //   displayName: 'Two-Hand Weapons',
  //   group: 1,
  //   type: [50, 51, 52, 53, 54, 55, 56],
  //   category: 'Weapon'
  // },

  // Specific weapons
  bludgeon: {
    key: 'bludgeon',
    displayName: 'Bludgeon',
    group: 1,
    type: 30,
    category: 'One-Hand Weapon'
  },
  dagger: {
    key: 'dagger',
    displayName: 'Dagger',
    group: 1,
    type: 31,
    category: 'One-Hand Weapon'
  },
  longsword: {
    key: 'longsword',
    displayName: 'Longsword',
    group: 1,
    type: 32,
    category: 'One-Hand Weapon'
  },
  scepter: {
    key: 'scepter',
    displayName: 'Scepter',
    group: 1,
    type: 33,
    category: 'One-Hand Weapon'
  },
  throwingstar: {
    key: 'throwingstar',
    displayName: 'Throwing Star',
    group: 1,
    type: 34,
    category: 'One-Hand Weapon'
  },
  spellbook: {
    key: 'spellbook',
    displayName: 'Spellbook',
    group: 1,
    type: 40,
    category: 'Off-Hand Weapon'
  },
  shield: {
    key: 'shield',
    displayName: 'Shield',
    group: 1,
    type: 41,
    category: 'Off-Hand Weapon'
  },
  greatsword: {
    key: 'greatsword',
    displayName: 'Greatsword',
    group: 1,
    type: 50,
    category: 'Two-Hand Weapon'
  },
  bow: {
    key: 'bow',
    displayName: 'Bow',
    group: 1,
    type: 51,
    category: 'Two-Hand Weapon'
  },
  staff: {
    key: 'staff',
    displayName: 'Staff',
    group: 1,
    type: 52,
    category: 'Two-Hand Weapon'
  },
  cannon: {
    key: 'cannon',
    displayName: 'Cannon',
    group: 1,
    type: 53,
    category: 'Two-Hand Weapon'
  },
  blade: {
    key: 'blade',
    displayName: 'Blade',
    group: 1,
    type: 54,
    category: 'Two-Hand Weapon'
  },
  knuckle: {
    key: 'knuckle',
    displayName: 'Knuckle',
    group: 1,
    type: 55,
    category: 'Two-Hand Weapon'
  },
  orb: {
    key: 'orb',
    displayName: 'Orb',
    group: 1,
    type: 56,
    category: 'Two-Hand Weapon'
  },

  // Other items
  consumable: {
    key: 'consumable',
    displayName: 'Consumable',
    group: 2,
    type: 0,
    category: 'Consumable'
  },
  gemstone: {
    key: 'gemstone',
    displayName: 'Gemstone',
    group: 4,
    type: 2,
    category: 'Gemstone'
  },
  pet: {
    key: 'pet',
    displayName: 'Pet',
    group: 6,
    type: [10, 29],
    category: 'Pet'
  },

  // Mounts
  // mount: {
  //   key: 'mount',
  //   displayName: 'Mount (All)',
  //   group: -1,
  //   type: -1,
  //   category: 'Mount'
  // },
  airmount: {
    key: 'airmount',
    displayName: 'Air Mount',
    group: 4,
    type: 4,
    category: 'Mount'
  },
  groundmount: {
    key: 'groundmount',
    displayName: 'Ground Mount',
    group: 5,
    type: 6,
    category: 'Mount'
  },
  badge: {
    key: 'badge',
    displayName: 'Badge',
    group: 7,
    type: -1,
    category: 'Badge'
  }
};

// Helper functions
export function getItemTypeKeys(): string[] {
  return Object.keys(ItemTypes);
}

export function getItemTypeDisplayNames(): string[] {
  return Object.values(ItemTypes).map((itemType) => itemType.displayName);
}

// Get all item types organized by category
export function getItemTypesByCategory(): Record<string, ItemTypeDefinition[]> {
  const categories: Record<string, ItemTypeDefinition[]> = {};

  Object.values(ItemTypes).forEach((itemType) => {
    const category = itemType.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(itemType);
  });

  return categories;
}

export function getItemTypeByDisplayName(displayName: string): ItemTypeDefinition | undefined {
  return Object.values(ItemTypes).find((itemType) => itemType.displayName === displayName);
}

export function getItemTypeKeyByDisplayName(displayName: string): string | undefined {
  const itemType = getItemTypeByDisplayName(displayName);
  return itemType ? itemType.key : undefined;
}
