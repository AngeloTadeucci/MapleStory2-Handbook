export interface Trophy {
  id: number;
  name: string;
  visit_count: number;
  icon: string;
}

export type SearchTrophy = Pick<Trophy, 'id' | 'name' | 'icon'>;
