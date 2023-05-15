export enum IconCode {
	'Weapon' = 1,
	'Armor' = 2,
	'Accessory' = 3,
	'Active Skill Book' = 4,
	'Passive Skill Book' = 5,
	'Consumable' = 6,
	'Enhancement' = 7,
	'Action' = 8,
	'Misc' = 9,
	'Terrain' = 10,
	'Building' = 11,
	'Furnishing' = 12,
	'Souvenir' = 13,
	'Ground Mount' = 14,
	'Mannequin' = 15,
	'Storage' = 16,
	'Controller' = 17,
	'Voucher' = 18,
	'Action Skill Book' = 19,
	'Badge' = 20,
	'Storybook' = 21,
	'Maid' = 22,
	'Package' = 23,
	'Event' = 24,
	'Crystal' = 25,
	'Radio' = 26,
	'Key' = 27,
	'Cooking Station' = 28,
	'Alchemy Station' = 29,
	'Jeweling Station' = 30,
	'Curio' = 31,
	'Trigger Controller' = 32,
	'Furnishing Voucher' = 33,
	'Pet' = 34,
	'Fishing Pole' = 35,
	'Instrument' = 36,
	'Music Score' = 37,
	'Pet Food' = 38,
	'Bait' = 39,
	'Gemstone' = 40,
	'Gem Dust' = 41,
	'Currency' = 42,
	'Quest' = 43,
	'Air Mount' = 44,
	'Pet Gear' = 45,
	'Taming Tool' = 46,
	'Pet Goods' = 47,
	'Trap' = 48,
	'Message Interior' = 49,
	'Lapenshard' = 50,
	'Blueprint' = 52,
	'Capsule' = 53,
	'Hair' = 100
}

export enum Gender {
	'Male' = 0,
	'Female' = 1,
	'Universal' = 2
}

export enum Job {
	'GlobalJob' = 0,
	'Beginner' = 1,
	'Knight' = 10,
	'Berserker' = 20,
	'Wizard' = 30,
	'Priest' = 40,
	'Archer' = 50,
	'HeavyGunner' = 60,
	'Thief' = 70,
	'Assassin' = 80,
	'RuneBlader' = 90,
	'Striker' = 100,
	'SoulBinder' = 110
}

export const Jobs = [0, 1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];

export enum NpcType {
	'Enemy' = 0,
	'Ally' = 1,
	'Friendly' = 2
}

export enum Rarity {
	'Normal' = 1,
	'Rare' = 2,
	'Exceptional' = 3,
	'Epic' = 4,
	'Legendary' = 5,
	'Ascendant' = 6
}

export enum SlotName {
	'Face Accessory' = 10,
	'Eyewear' = 11,
	'Earrings' = 12,
	'Headgear' = 13,
	'Top' = 14,
	'Bottom' = 15,
	'Gloves' = 16,
	'Shoes' = 17,
	'Cape' = 18,
	'Necklace' = 19,
	'Ring' = 20,
	'Belt' = 21,
	'Suit' = 22,
	'Main Hand Bludgeon' = 30,
	'One-handed Dagger' = 31,
	'Main Hand Longsword' = 32,
	'Main Hand Scepter' = 33,
	'One-handed Thrown Weapon' = 34,
	'Off-hand Codex' = 40,
	'Off-hand Shield' = 41,
	'Two-handed Greatsword' = 50,
	'Two-handed Bow' = 51,
	'Two-handed Staff' = 52,
	'Two-handed Cannon' = 53,
	'Two-handed Blade' = 54,
	'Two-handed Knuckles' = 55,
	'Two-handed Orb' = 56
}

export enum TransferType {
	'Tradeable' = 0,
	'Untradeable' = 1,
	'Bind on loot' = 2,
	'Bind on equip' = 3,
	'Bind on use' = 4,
	'Bind on trade' = 5,
	'Tradeable on black market' = 6,
	'Bind on summon, enchant, or reroll' = 7
}

export enum Stat {
	'Strength' = 0,
	'Dexterity' = 1,
	'Intelligence' = 2,
	'Luck' = 3,
	'Health' = 4,
	'Health Regen' = 5,
	'Health Regen Interval' = 6,
	'Spirit' = 7,
	'Spirit Regen' = 8,
	'Spirit Regen Interval' = 9,
	'Stamina' = 10,
	'Stamina Regen' = 11,
	'Stamina Regen Interval' = 12,
	'Attack Speed' = 13,
	'Movement Speed' = 14,
	'Accuracy' = 15,
	'Evasion' = 16,
	'Critical Rate' = 17,
	'Critical Damage' = 18,
	'Critical Evasion' = 19,
	'Defense' = 20,
	'Perfect Guard' = 21,
	'Jump Height' = 22,
	'Physical Attack' = 23,
	'Magic Attack' = 24,
	'Physical Resistance' = 25,
	'Magic Resistance' = 26,
	'Min Weapon Attack' = 27,
	'Max Weapon Attack' = 28,
	'Min Damage' = 29,
	'Max Damage' = 30,
	'Pierce' = 31,
	'Mount Movement Speed' = 32,
	'Bonus Attack' = 33,
	'Pet Bonus Attack' = 34
}

export function enumToWhitelist<T extends { [index: string]: any }>(enumObj: T): string[] {
	const result = [];

	for (const key in enumObj) {
		if (!isNaN(Number(key))) {
			result.push(String(enumObj[key]));
		}
	}

	return result;
}
