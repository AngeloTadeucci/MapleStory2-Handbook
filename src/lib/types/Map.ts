export interface Map {
    id: number;
    name: string;
  }
  
  export type SearchMap = Pick<Map, 'id' | 'name'>;
  