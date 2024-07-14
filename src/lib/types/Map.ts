export interface Map {
  id: number;
  name: string;
  visit_count: number;
  icon: string;
  minimap: string;
  bg: string;
}

export type SearchMap = Pick<Map, 'id' | 'name' | 'icon'>;
