export enum QuestType {
  EpicQuest = 0,
  WorldQuest = 1,
  EventQuest = 2,
  DailyMission = 3, // Navigator
  FieldMission = 4, // Exploration
  EventMission = 5,
  GuildQuest = 6,
  MentoringMission = 7,
  FieldQuest = 8,
  AllianceQuest = 9,
  WeddingMission = 10,
}

export interface Quest {
  id: number;
  name: string;
  description: string;
  manualDescription: string;
  completeDescription: string;
  questLevel: number;
  requiredLevel: number;
  questType: number;
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

export function getQuestTypeName(questType: number): string {
  switch (questType) {
    case QuestType.EpicQuest:
      return 'Epic Quest';
    case QuestType.WorldQuest:
      return 'World Quest';
    case QuestType.EventQuest:
      return 'Event Quest';
    case QuestType.DailyMission:
      return 'Daily Mission';
    case QuestType.FieldMission:
      return 'Field Mission';
    case QuestType.EventMission:
      return 'Event Mission';
    case QuestType.GuildQuest:
      return 'Guild Quest';
    case QuestType.MentoringMission:
      return 'Mentoring Mission';
    case QuestType.FieldQuest:
      return 'Field Quest';
    case QuestType.AllianceQuest:
      return 'Alliance Quest';
    case QuestType.WeddingMission:
      return 'Wedding Mission';
    default:
      return 'Unknown Quest Type';
  }
}

export function questTypeToWhitelist(): string[] {
  return [
    'Epic Quest',
    'World Quest',
    'Event Quest',
    'Daily Mission',
    'Field Mission',
    'Event Mission',
    'Guild Quest',
    'Mentoring Mission',
    'Field Quest',
    'Alliance Quest',
    'Wedding Mission'
  ];
}

export function getQuestTypeByDisplayName(displayName: string): number | undefined {
  switch (displayName) {
    case 'Epic Quest':
      return QuestType.EpicQuest;
    case 'World Quest':
      return QuestType.WorldQuest;
    case 'Event Quest':
      return QuestType.EventQuest;
    case 'Daily Mission':
      return QuestType.DailyMission;
    case 'Field Mission':
      return QuestType.FieldMission;
    case 'Event Mission':
      return QuestType.EventMission;
    case 'Guild Quest':
      return QuestType.GuildQuest;
    case 'Mentoring Mission':
      return QuestType.MentoringMission;
    case 'Field Quest':
      return QuestType.FieldQuest;
    case 'Alliance Quest':
      return QuestType.AllianceQuest;
    case 'Wedding Mission':
      return QuestType.WeddingMission;
    default:
      return undefined;
  }
}
