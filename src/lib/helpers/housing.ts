export const HOUSING_CATEGORIES = [
	{ value: 1, label: 'Bed' },
	{ value: 2, label: 'Table' },
	{ value: 3, label: 'Sofas & Chairs' },
	{ value: 4, label: 'Storage' },
	{ value: 5, label: 'Wall Decoration' },
	{ value: 6, label: 'Wall Tiles' },
	{ value: 7, label: 'Bathroom' },
	{ value: 8, label: 'Lighting' },
	{ value: 9, label: 'Electronics' },
	{ value: 10, label: 'Fences' },
	{ value: 11, label: 'Natural Terrain' },
	{ value: 12, label: 'Garden' },
	{ value: 13, label: 'Special Blocks' },
	{ value: 14, label: 'Stairs' },
	{ value: 15, label: 'Doors' },
	{ value: 16, label: 'Common Terrain' },
	{ value: 17, label: 'Vegetation' },
	{ value: 18, label: 'Interior Decor' },
	{ value: 19, label: 'Themed Decor' },
	{ value: 20, label: 'Structures' },
	{ value: 21, label: 'Traps' },
	{ value: 91, label: 'Maid' },
	{ value: 92, label: 'Souvenirs' },
	{ value: 93, label: 'UGC Block' },
	{ value: 94, label: 'Event' },
	{ value: 95, label: 'UGC Bed' },
	{ value: 96, label: 'UGC Table' },
	{ value: 97, label: 'UGC Stairs' },
	{ value: 204, label: 'Ranching' },
	{ value: 205, label: 'Farming' },
	{ value: 10000, label: 'Misc' }
] as const;

export const HOUSING_TOKENS = [
	{ value: 1, label: 'Meso' },
	{ value: 3, label: 'Meret' }
] as const;

const categoryLabels = new Map<number, string>(
	HOUSING_CATEGORIES.map((category) => [category.value, category.label])
);
const tokenLabels = new Map<number, string>(
	HOUSING_TOKENS.map((token) => [token.value, token.label])
);

export function getHousingCategoryLabel(category: number): string {
	return categoryLabels.get(category) ?? `Category ${category}`;
}

export function isHousingCategory(category: number): boolean {
	return categoryLabels.has(category);
}

export function isCatalogHousingItem(category: number, hasShopMetadata: boolean): boolean {
	return category > 0 && (category !== 10000 || hasShopMetadata);
}

export function getHousingTokenLabel(tokenType: number): string {
	return tokenLabels.get(tokenType) ?? `Token ${tokenType}`;
}

export function parseHousingFilterNumber(value: string | null): number | null {
	if (value == null || value.trim() === '') {
		return null;
	}

	if (!/^\d+$/.test(value)) {
		return null;
	}

	return Number(value);
}
