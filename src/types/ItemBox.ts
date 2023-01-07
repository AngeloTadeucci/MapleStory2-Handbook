export interface ItemBox {
  box_id: number;
  item_id: number;
  item_id2: number;
  min_count: number;
  max_count: number;
  rarity: number;
  name: string;
  icon_path: string;
  job_limit: number[];
  job_recommend: number[];
  smart_drop_rate: number;
  group_drop_id: number;
}
