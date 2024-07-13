export interface Trophy {
  portrait: any;
  id: number;
  name: string;
  visit_count: number;
  icon: string;
  description: string;
  complete_description: string;
}

export type SearchTrophy = Pick<
  Trophy,
  'id' |
  'name' |
  'icon' |
  'description' |
  'complete_description'>;
