export enum ElementType {
  Fire = '火',
  Water = '水',
  Grass = '草',
  Electric = '电',
  Rock = '岩',
  Psychic = '超能',
  Normal = '普通',
  Dark = '暗',
  Fighting = '格斗',
  Bug = '虫'
}

export interface Move {
  name: string;
  type: ElementType;
  power: number; // 0-100
  accuracy: number; // 0-100
  isStatus?: boolean;
}

export interface Stats {
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  spAttack: number; // Special Attack
  spDefense: number; // Special Defense
  speed: number;
}

export interface GenMon {
  id: string;
  name: string;
  element: ElementType;
  stats: Stats;
  moves: Move[];
  description: string;
  imageUrl?: string; // Base64 or URL
  modelUrl?: string; // URL to a GLB/GLTF model
  visualPrompt: string; // Used to generate image/model if missing
  level: number;
  exp: number;
  /** 已进化次数，用于「每10级可进化一次」条件 */
  evolutionCount?: number;
  evolution?: {
    nextStage: string;
    condition: string;
  };
}

export interface Inventory {
  potions: number;
  balls: number;
}

export enum GameState {
  START_MENU = 'START_MENU',
  STARTER_SELECT = 'STARTER_SELECT',
  EXPLORE = 'EXPLORE',
  BATTLE = 'BATTLE',
  BATTLE_RESULT = 'BATTLE_RESULT',
  TEAM_VIEW = 'TEAM_VIEW',
  BACKPACK = 'BACKPACK',
  GAME_OVER = 'GAME_OVER',
  LAB = 'LAB',
  EVOLVING = 'EVOLVING'
}

export enum Biome {
  FOREST = '森林',
  VOLCANO = '火山',
  CAVE = '洞穴',
  OCEAN = '海洋',
  CITY = '赛博都市',
  RUINS = '远古遗迹',
  GYM = '挑战者道馆'
}