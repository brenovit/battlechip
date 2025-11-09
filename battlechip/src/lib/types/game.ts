export type ResourceType = 'database' | 'backup' | 'server' | 'firewall' | 'iot-cluster' | 'router';

export type CellStatus = 'empty' | 'miss' | 'hit' | 'destroyed';

export type Orientation = 'horizontal' | 'vertical';

export interface ResourceDefinition {
	type: ResourceType;
	name: string;
	size: number;
	basePoints: number;
	description: string;
	emoji: string;
}

export const RESOURCES: Record<ResourceType, ResourceDefinition> = {
	database: {
		type: 'database',
		name: 'Database',
		size: 5,
		basePoints: 500,
		description: 'The crown jewel. Contains all the critical data.',
		emoji: '🗄️'
	},
	backup: {
		type: 'backup',
		name: 'Backup',
		size: 4,
		basePoints: 300,
		description: 'Offline data storage. A high-value secondary target.',
		emoji: '💾'
	},
	server: {
		type: 'server',
		name: 'Server',
		size: 4,
		basePoints: 250,
		description: 'The main application server. Holds the logic.',
		emoji: '🖥️'
	},
	firewall: {
		type: 'firewall',
		name: 'Firewall',
		size: 3,
		basePoints: 150,
		description: "The network's main defense.",
		emoji: '🛡️'
	},
	'iot-cluster': {
		type: 'iot-cluster',
		name: 'IoT Cluster',
		size: 3,
		basePoints: 100,
		description: 'A group of "smart" devices, often a weak point.',
		emoji: '📱'
	},
	router: {
		type: 'router',
		name: 'Router',
		size: 2,
		basePoints: 50,
		description: 'The entry point that directs network traffic.',
		emoji: '📡'
	}
};

export interface Coordinate {
	row: number;
	col: number;
}

export interface PlacedResource {
	type: ResourceType;
	coordinates: Coordinate[];
	hits: Set<string>;
	isDestroyed: boolean;
}

export interface Cell {
	coordinate: Coordinate;
	status: CellStatus;
	resourceType?: ResourceType;
}

export interface Grid {
	cells: Cell[][];
	resources: PlacedResource[];
}

export interface AttackResult {
	coordinate: Coordinate;
	status: 'miss' | 'hit' | 'destroyed';
	resourceType?: ResourceType;
	points: number;
	message: string;
}

export interface PingSweepResult {
	center: Coordinate;
	results: Map<string, CellStatus>;
}

export type SpecialAbility = 'ping-sweep' | 'admin-access' | 'ddos-effect';

export interface PlayerAbilities {
	pingSweepAvailable: boolean;
	adminAccessActive: boolean;
	ddosEffectActive: boolean;
}

export interface PlayerState {
	id: string;
	name: string;
	grid: Grid;
	score: number;
	abilities: PlayerAbilities;
	destroyedResources: Set<ResourceType>;
	isReady: boolean;
}

export type GamePhase = 'lobby' | 'placement' | 'battle' | 'game-over';

export interface GameState {
	id: string;
	phase: GamePhase;
	players: [PlayerState, PlayerState];
	currentTurn: number;
	winner?: number;
	createdAt: Date;
}

export interface GameRoom {
	gameState: GameState;
	playerSockets: Map<string, string>;
}

export interface SocketEvents {
	'create-game': (playerName: string, callback: (gameId: string, playerId: string) => void) => void;
	'join-game': (
		gameId: string,
		playerName: string,
		callback: (success: boolean, playerId?: string, error?: string) => void
	) => void;
	'place-resources': (
		gameId: string,
		playerId: string,
		resources: Array<{ type: ResourceType; start: Coordinate; orientation: Orientation }>
	) => void;
	'player-ready': (gameId: string, playerId: string) => void;
	'attack': (
		gameId: string,
		playerId: string,
		coordinate: Coordinate,
		callback: (result: AttackResult) => void
	) => void;
	'use-ping-sweep': (
		gameId: string,
		playerId: string,
		coordinate: Coordinate,
		callback: (result: PingSweepResult) => void
	) => void;
	'game-update': (gameState: Partial<GameState>) => void;
	'opponent-ready': () => void;
	'battle-started': () => void;
	'your-turn': () => void;
	'opponent-attacked': (coordinate: Coordinate, wasHit: boolean) => void;
	'game-over': (winner: number, finalScores: [number, number]) => void;
	error: (message: string) => void;
}

export const GRID_SIZE = 10;
export const HIT_POINTS = 10;
export const ADMIN_ACCESS_MULTIPLIER = 2;
export const DATABASE_CHAIN_BONUS_MULTIPLIER = 2;
