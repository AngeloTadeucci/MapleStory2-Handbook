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

export type SearchNpc = Pick<Npc, 'id' | 'name' | 'portrait' | 'title'>;
