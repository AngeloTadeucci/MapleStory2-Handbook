export interface ItemBox {
  uid: number;
  box_id: number;
  item_id: number;
  item_id2: number;
  min_count: number;
  max_count: number;
  rarity: number;
  smart_drop_rate: number;
  group_drop_id: number;
  item1: {
    name: string;
    icon_path: string;
    job_limit: number[];
    job_recommend: number[];
  };
}
