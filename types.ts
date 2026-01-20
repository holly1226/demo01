
export enum GamePhase {
  LOBBY = 'LOBBY',
  JOINING = 'JOINING',
  GENERATING = 'GENERATING',
  INTRO = 'INTRO',
  SELF_INTRO = 'SELF_INTRO',
  GAME_LOOP = 'GAME_LOOP',
  FINALE = 'FINALE'
}

export interface Player {
  id: string;
  peerId?: string; // 设备的 Peer 标识
  name: string;
  gender: 'male' | 'female';
  isHost: boolean;
  role?: string;
  secretTask?: string;
  background?: string;
}

export interface Choice {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  description: string;
}

export interface GameState {
  roomID: string;
  isHostMode: boolean; // 是否是房主设备
  players: Player[];
  genre: string;
  currentPhase: GamePhase;
  stage: number; 
  scriptTitle: string;
  openingText: string;
  sharedReadingText: string;
  dmAvatar: string;
  dmVoice: string;
  history: { sender: string; text: string }[];
  currentSpeakerId?: string;
}

export interface AIResponse {
  nextPhase?: GamePhase;
  dmText: string;
  voicePrompt: string;
  choices?: Choice[];
  updatedStage?: number;
  playersUpdate?: Partial<Player>[];
  sharedReading?: string;
}
