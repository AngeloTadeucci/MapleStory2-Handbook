import type { SearchItem } from '$lib/types/Item';
import { closeMissingTags, unescapeHtml } from './htmlParser';

const isWeapon = (slot: number) => slot == 4 || slot == 5 || slot == 19 || slot == 20;

const isAccessory = (slot: number) =>
	slot == 12 || slot == 14 || slot == 15 || slot == 16 || slot == 17;

const isArmor = (slot: number) =>
	slot == 6 || slot == 7 || slot == 8 || slot == 9 || slot == 10 || slot == 11;

const getDescription = (item: SearchItem) => {
	if (item.main_description.length > 0) {
		return closeMissingTags(unescapeHtml(item.main_description), true);
	} else if (item.guide_description.length > 0) {
		return closeMissingTags(unescapeHtml(item.guide_description), true);
	} else if (item.tooltip_description.length > 0) {
		return closeMissingTags(unescapeHtml(item.tooltip_description), true);
	} else {
		return 'No description';
	}
};

export default {
	isWeapon,
	isAccessory,
	isArmor,
	getDescription
};
