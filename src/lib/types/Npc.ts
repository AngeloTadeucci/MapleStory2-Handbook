export interface Npc {
  id: number;
  name: string;
  kfm: string;
  is_boss: number;
  npc_type: number;
  gender: number;
  level: number;
  portrait: string;
  stats: Stats;
  visit_count: number;
  animations: string[];
  race: string;
  class_name: string;
  field_metadata: FieldMetadata[];
  title: string;
  shop_id: number;
}

export interface FieldMetadata {
  Item1: string; // name
  Item2: number; // id
}

export interface Stats {
  Str: number;
  Dex: number;
  Int: number;
  Luk: number;
  Hp: number;
  HpRgp: number;
  HpInv: number;
  Sp: number;
  SpRgp: number;
  SpInv: number;
  Ep: number;
  EpRgp: number;
  EpInv: number;
  Asp: number;
  Msp: number;
  Atp: number;
  Evp: number;
  Cap: number;
  Cad: number;
  Car: number;
  Ndd: number;
  Abp: number;
  Jmp: number;
  Pap: number;
  Map: number;
  Par: number;
  Mar: number;
  Wapmin: number;
  Wapmax: number;
  Dmg: number;
  Pen: number;
  Rmsp: number;
  Bap: number;
  BapPet: number;
  Hiddenhpadd: number;
  Hiddennddadd: number;
  Hiddenwapadd: number;
  Hiddenhpadd03: number;
  Hiddennddadd03: number;
  Hiddenwapadd03: number;
  Hiddenhpadd04: number;
  Hiddennddadd04: number;
  Hiddenwapadd04: number;
  ScaleStatRate1: number;
  ScaleStatRate2: number;
  ScaleStatRate3: number;
  ScaleStatRate4: number;
  ScaleBaseTap1: number;
  ScaleBaseTap2: number;
  ScaleBaseTap3: number;
  ScaleBaseTap4: number;
  ScaleBaseDef1: number;
  ScaleBaseDef2: number;
  ScaleBaseDef3: number;
  ScaleBaseDef4: number;
  ScaleBaseSpaRate1: number;
  ScaleBaseSpaRate2: number;
  ScaleBaseSpaRate3: number;
  ScaleBaseSpaRate4: number;
}

export function toReadableStat(stat: string): string {
  switch (stat) {
    case 'Str':
      return 'Strength';
    case 'Dex':
      return 'Dexterity';
    case 'Int':
      return 'Intelligence';
    case 'Luk':
      return 'Luck';
    case 'Hp':
      return 'Health';
    case 'HpRgp':
      return 'Health Regen';
    case 'HpInv':
      return 'Health Regen Interval';
    case 'Sp':
      return 'Spirit';
    case 'SpRgp':
      return 'Spirit Regen';
    case 'SpInv':
      return 'Spirit Regen Interval';
    case 'Ep':
      return 'Stamina';
    case 'EpRgp':
      return 'Stamina Regen';
    case 'EpInv':
      return 'Stamina Regen Interval';
    case 'Asp':
      return 'Attack Speed';
    case 'Msp':
      return 'Movement Speed';
    case 'Atp':
      return 'Attack Power';
    case 'Evp':
      return 'Evasion';
    case 'Cap':
      return 'Critical Rate';
    case 'Cad':
      return 'Critical Damage';
    case 'Car':
      return 'Critical Evasion';
    case 'Ndd':
      return 'Normal Damage Decrease';
    case 'Abp':
      return 'Perfect Guard';
    case 'Jmp':
      return 'Jump';
    case 'Pap':
      return 'Physical Armor Penetration';
    case 'Map':
      return 'Magic Armor Penetration';
    case 'Par':
      return 'Physical Resistance';
    case 'Mar':
      return 'Magic Resistance';
    case 'Wapmin':
      return 'Weapon Minimum Damage';
    case 'Wapmax':
      return 'Weapon Maximum Damage';
    case 'Dmg':
      return 'Damage';
    case 'Pen':
      return 'Piercing';
    case 'Rmsp':
      return 'Mount Speed';
    case 'Bap':
      return 'Bonus Attack Power';
    case 'BapPet':
      return 'Bonus Attack Power (Pet)';
    case 'Hiddenhpadd':
      return 'Hidden Health Add';
    case 'Hiddennddadd':
      return 'Hidden Normal Damage Decrease Add';
    case 'Hiddenwapadd':
      return 'Hidden Weapon Damage Add';
    case 'Hiddenhpadd03':
      return 'Hidden Health Add 03';
    case 'Hiddennddadd03':
      return 'Hidden Normal Damage Decrease Add 03';
    case 'Hiddenwapadd03':
      return 'Hidden Weapon Damage Add 03';
    case 'Hiddenhpadd04':
      return 'Hidden Health Add 04';
    case 'Hiddennddadd04':
      return 'Hidden Normal Damage Decrease Add 04';
    case 'Hiddenwapadd04':
      return 'Hidden Weapon Damage Add 04';
    case 'ScaleStatRate1':
      return 'Scale Stat Rate 1';
    case 'ScaleStatRate2':
      return 'Scale Stat Rate 2';
    case 'ScaleStatRate3':
      return 'Scale Stat Rate 3';
    case 'ScaleStatRate4':
      return 'Scale Stat Rate 4';
    case 'ScaleBaseTap1':
      return 'Scale Base Attack Power 1';
    case 'ScaleBaseTap2':
      return 'Scale Base Attack Power 2';
    case 'ScaleBaseTap3':
      return 'Scale Base Attack Power 3';
    case 'ScaleBaseTap4':
      return 'Scale Base Attack Power 4';
    case 'ScaleBaseDef1':
      return 'Scale Base Defense 1';
    case 'ScaleBaseDef2':
      return 'Scale Base Defense 2';
    case 'ScaleBaseDef3':
      return 'Scale Base Defense 3';
    case 'ScaleBaseDef4':
      return 'Scale Base Defense 4';
    case 'ScaleBaseSpaRate1':
      return 'Scale Base Special Rate 1';
    case 'ScaleBaseSpaRate2':
      return 'Scale Base Special Rate 2';
    case 'ScaleBaseSpaRate3':
      return 'Scale Base Special Rate 3';
    case 'ScaleBaseSpaRate4':
      return 'Scale Base Special Rate 4';
    default:
      return stat;
  }
}

export type SearchNpc = Pick<Npc, 'id' | 'name' | 'portrait' | 'title'>;
