export interface Map {
  id: number;
  name: string;
  visit_count: number;
  portrait: string;
}

export type SearchMap = Pick<Map, 'id' | 'name' | 'portrait'>;
