export interface Coordinate {
  row: number;
  col: number;
}

export interface Cell {
  coordinate: Coordinate;
  status: 'empty' | 'miss' | 'hit' | 'destroyed';
  resourceType?: string;
}

export interface Grid {
  cells: Cell[][];
  resources: PlacedResource[];
}

export interface ResourceDefinition {
  type: string;
  name: string;
  size: number;
  basePoints: number;
}

export interface PlacedResource {
  type: string;
  coordinates: Coordinate[];
  hits: Set<string>;
  isDestroyed: boolean;
}

export interface Abilities {
  pingSweepAvailable: boolean;
  adminAccessActive: boolean;
  ddosEffectActive: boolean;
}

export interface Player {
  id: string;
  name: string;
  grid: Grid;
  score: number;
  abilities: Abilities;
  destroyedResources: Set<string>;
  isReady: boolean;
}

export interface GameState {
  id: string;
  phase: 'lobby' | 'placement' | 'battle' | 'game-over';
  players: [Player, Player | null];
  currentTurn: number;
  winner?: number;
  createdAt: Date;
}

export interface GameRoom {
  gameState: GameState;
  playerSockets: Map<string, string>;
  rematchRequests?: Set<string>;
}

export interface ResourcePlacement {
  type: string;
  start: Coordinate;
  orientation: 'horizontal' | 'vertical';
}

export interface AttackResult {
  coordinate: Coordinate;
  status: 'miss' | 'hit' | 'destroyed';
  resourceType?: string;
  points: number;
  message: string;
  destroyedCoordinates?: Coordinate[];
}
