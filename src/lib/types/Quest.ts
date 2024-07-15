export interface Quest {
  id: number;
  name: string;
  description: string;
  manualDescription: string;
  completeDescription: string;
  questLevel: number;
  requiredLevel: number;
  requiredQuest: {
    Id: number;
    Name: string;
  }[];
  selectableQuest: {
    Id: number;
    Name: string;
  }[];
  startNpcId: number;
  startNpcName: string | undefined;
  completeNpcId: number;
  completeNpcName: string | undefined;
  startRewards: Rewards;
  completeRewards: Rewards;
  visit_count: number;
}

export interface Rewards {
  Exp: number;
  Rue: number;
  Meso: number;
  Treva: number;
  GuildExp: number;
  GuildCoin: number;
  GuildFund: number;
  MenteeCoin: number;
  RelativeExp: number;
  MissionPoint: number;
  EssentialItem: QuestItem[];
  EssentialJobItem: QuestItem[];
}

export interface QuestItem {
  Id: number;
  Name: string | undefined;
  IconPath: string | undefined;
  IsOutfit: boolean | undefined;
  Amount: number;
  Rarity: number;
}

export type SearchQuest = Pick<Quest, 'id' | 'name'>;
