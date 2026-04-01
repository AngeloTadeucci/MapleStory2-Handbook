export enum BgmCategory {
	All = 'all',
	Town = 'town',
	Field = 'field',
	Boss = 'boss',
	Dungeon = 'dungeon',
	Theme = 'theme',
	Wedding = 'wedding',
	Dance = 'dance',
	Event = 'event',
	Other = 'other'
}

export const BGM_CATEGORY_LABELS: Record<BgmCategory, string> = {
	[BgmCategory.All]: 'All',
	[BgmCategory.Town]: 'Town',
	[BgmCategory.Field]: 'Field',
	[BgmCategory.Boss]: 'Boss',
	[BgmCategory.Dungeon]: 'Dungeon',
	[BgmCategory.Theme]: 'Class Theme',
	[BgmCategory.Wedding]: 'Wedding',
	[BgmCategory.Dance]: 'Dance',
	[BgmCategory.Event]: 'Event',
	[BgmCategory.Other]: 'Other'
};

export function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function bgmDisplayName(name: string): string {
	return name.replace(/^BGM_/, '').replace(/_/g, ' ');
}

export function getBgmCategory(name: string): BgmCategory {
	const n = name.toLowerCase();
	if (n.startsWith('ddstop_')) return 'dance';
	if (n.includes('boss') || n.includes('barlog')) return 'boss';
	if (
		n.includes('wedding') ||
		n.includes('weddingmarch') ||
		n.includes('weddingchapel') ||
		n.includes('weddingvillage') ||
		n.includes('weddingcastle') ||
		n.includes('weddingvalley') ||
		n.includes('cruisewedding')
	)
		return 'wedding';
	if (
		/_theme_\d/.test(n) &&
		(n.includes('assassin') ||
			n.includes('wizard') ||
			n.includes('heavygunner') ||
			n.includes('knight') ||
			n.includes('priest') ||
			n.includes('ranger') ||
			n.includes('thief') ||
			n.includes('berserker') ||
			n.includes('striker') ||
			n.includes('soulbinder') ||
			n.includes('runeblader'))
	)
		return 'theme';
	if (n.includes('field') || n.includes('_field_')) return 'field';
	if (
		n.includes('dungeon') ||
		n.includes('prison') ||
		n.includes('cave') ||
		n.includes('darkfort') ||
		n.includes('darktower') ||
		n.includes('laboratory')
	)
		return 'dungeon';
	if (
		n.includes('arcade') ||
		n.includes('event') ||
		n.includes('halloween') ||
		n.includes('christmas') ||
		n.includes('jinglebell') ||
		n.includes('birthday') ||
		n.includes('pinkbean') ||
		n.includes('pinata') ||
		n.includes('yoyo') ||
		n.includes('hidenseek') ||
		n.includes('mushroom')
	)
		return 'event';
	if (
		n.includes('henesys') ||
		n.includes('tria') ||
		n.includes('ellinia') ||
		n.includes('perion') ||
		n.includes('kerningcity') ||
		n.includes('lith') ||
		n.includes('ludibrium') ||
		n.includes('beautystreet') ||
		n.includes('lapenta') ||
		n.includes('royalcity') ||
		n.includes('temple') ||
		n.includes('acropolis') ||
		n.includes('skyfortress') ||
		n.includes('kritias') ||
		n.includes('talisker') ||
		n.includes('indoor') ||
		n.includes('forgestreet') ||
		n.includes('blackmarket') ||
		n.includes('ereb') ||
		n.includes('oceanland') ||
		n.includes('snowland') ||
		n.includes('iceville') ||
		n.includes('icevillage')
	)
		return 'town';
	return 'other';
}
