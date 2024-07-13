import type { Prisma } from '@prisma/client';
import type { ItemBox } from './ItemBox';

export default interface Item {
  id: number;
  name: string;
  tooltip_description: string;
  guide_description: string;
  main_description: string;
  rarity: number;
  is_outfit: boolean | number;
  job_limit: number[];
  level_min: number;
  level_max: number;
  gender: number;
  icon_path: string;
  visit_count: number;
  pet_id: number;
  is_ugc: number;
  transfer_type: number;
  sellable: boolean;
  breakable: boolean;
  fusionable: boolean;
  skill_id: number;
  skill_level: number;
  stack_limit: number;
  tradeable_count: number;
  repackage_limit: number;
  repackage_scrolls: string;
  repackage_count: number;
  sell_price: number[];
  kfms: string[];
  icon_code: number;
  move_disable: number;
  remake_disable: number;
  gear_score: number;
  enchantable: number;
  dyeable: number;
  constants_stats: StatList[];
  static_stats: StatRangeList[];
  random_stats: StatRangeList[];
  random_stat_count: number;
  slot: number;
  set_info: number[];
  set_data?: SetInfo[];
  set_name: string;
  item_preset: string;
  glamour_count: number;
  box_id: number;
  box_content?: ItemBox[];
  item_type: number;
  represent_option: number;
  additional_effects: string;
}

export interface SetInfo {
  Item1: string; // item name
  Item2: number; // item id
}

export interface AdditionalEffects {
  Item1: number; // skill id
  Item2: number; // skill level
}

export interface StatList {
  Item1: Stat;
  Item2: string;
}

export interface Stat {
  ItemAttribute: number;
  AttributeType: StatAttributeType;
  Value: number;
}

export interface StatRangeList {
  Item1: StatRange;
  Item2: string;
}

export interface StatRange {
  ItemAttribute: number;
  AttributeType: StatAttributeType;
  ValueMin: number;
  ValueMax: number;
}

export enum StatAttributeType {
  Rate = 0,
  Flat = 1
}

export type SearchItem = Pick<
  Item,
  | 'id'
  | 'name'
  | 'rarity'
  | 'icon_path'
  | 'main_description'
  | 'guide_description'
  | 'tooltip_description'
>;

export interface AdditionalEffectDescription {
  id: number;
  icon_path: string;
  name: string;
  description: string;
  levels: Prisma.JsonValue;
}
