const isWeapon = (slot: number) => slot == 4 || slot == 5 || slot == 19 || slot == 20;

const isAccessory = (slot: number) =>
	slot == 12 || slot == 14 || slot == 15 || slot == 16 || slot == 17;

const isArmor = (slot: number) =>
	slot == 6 || slot == 7 || slot == 8 || slot == 9 || slot == 10 || slot == 11;

export default {
	isWeapon,
	isAccessory,
	isArmor
};
