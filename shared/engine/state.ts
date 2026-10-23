/**
 * Full (authoritative, SERVER-ONLY) engine state. Never send this to a client;
 * use the projections in ./view.ts instead.
 */
import type { Coord, EnginePhase, ItemId, Orientation, Placement, Slot } from '../types.js';
import type { GameEvent } from '../events.js';

/**
 * Publicly observable state of a single cell on a board, as seen by the opponent / observers.
 * - unknown:   never shot (or repaired back to unknown)
 * - miss:      shot, nothing there
 * - hit:       shot, hardware damaged
 * - shielded:  shot, but the cell needs more hits before it is exposed (e.g. Firewall passive)
 * - destroyed: part of a fully destroyed item (item type becomes public)
 */
export type PublicCellState = 'unknown' | 'miss' | 'hit' | 'shielded' | 'destroyed';

export interface BoardCell {
	/** PRIVATE: which item occupies this cell (null = empty water). */
	item: ItemId | null;
	/** Number of shots that landed on this cell. */
	shots: number;
	/** Public state (what the opponent sees). */
	state: PublicCellState;
	/** Public: hardware presence revealed by an effect (e.g. Firewall destroyed, Hijack). */
	revealed: boolean;
}

export interface BoardItem {
	id: ItemId;
	owner: Slot;
	cells: Coord[];
	orientation: Orientation;
	/** Per-cell damaged flag (index aligned with `cells`). */
	damaged: boolean[];
	destroyed: boolean;
	/** Free-form per-item state owned by the item's hooks (e.g. "repairUsed"). Must stay JSON-serialisable. */
	data: Record<string, unknown>;
}

export interface AbilityState {
	/** Turns (of the owner) until the ability can be used again. 0 = ready. */
	cooldown: number;
	/** Remaining uses (null = unlimited). */
	usesLeft: number | null;
}

export interface PlayerStats {
	shots: number;
	hits: number;
	misses: number;
	itemsDestroyed: number;
	itemsLost: number;
	turns: number;
	timeouts: number;
	abilitiesUsed: number;
}

export interface EnginePlayer {
	slot: Slot;
	ready: boolean;
	placements: Placement[] | null;
	/** This player's own board (items + incoming shots). */
	cells: BoardCell[][];
	items: BoardItem[];
	score: number;
	stats: PlayerStats;
	abilities: Record<string, AbilityState>;
	/** Extra shots granted this turn (e.g. Overload). */
	extraShots: number;
	/** Free-form player-level status effects owned by item hooks. JSON-serialisable. */
	effects: Record<string, unknown>;
}

export interface EngineConfig {
	gridSize: number;
	/** Points per damaging hit. */
	hitPoints: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
	gridSize: 10,
	hitPoints: 10
};

export type GameOverReason = 'all-destroyed' | 'forfeit' | 'idle' | 'disconnect';

export interface EngineState {
	config: EngineConfig;
	phase: EnginePhase;
	/** Whose turn it is (battle only). */
	turn: Slot;
	/** Monotonic turn counter. 0 during placement, 1 = first battle turn. */
	turnNumber: number;
	players: [EnginePlayer, EnginePlayer];
	winner: Slot | null;
	endReason: GameOverReason | null;
	/** Monotonic id for shots, for correlating events. */
	nextShotId: number;
}

/** Actions accepted by the engine. All are validated inside applyAction. */
export type EngineAction =
	| { type: 'ready'; slot: Slot; placements: Placement[] }
	| { type: 'fire'; slot: Slot; target: Coord }
	| { type: 'ability'; slot: Slot; ability: string; target?: Coord }
	/** Turn timer elapsed: the server fires a random shot on behalf of `slot`. */
	| { type: 'timeout'; slot: Slot }
	| { type: 'forfeit'; slot: Slot; reason: GameOverReason };

export type EngineErrorCode =
	| 'wrong-phase'
	| 'not-your-turn'
	| 'out-of-bounds'
	| 'already-shot'
	| 'already-ready'
	| 'invalid-placement'
	| 'unknown-ability'
	| 'ability-unavailable'
	| 'ability-on-cooldown'
	| 'invalid-target'
	| 'invalid-action';

export interface EngineError {
	code: EngineErrorCode;
	message: string;
}

export type EngineResult =
	| { ok: true; state: EngineState; events: GameEvent[] }
	| { ok: false; error: EngineError; state: EngineState; events: [] };
