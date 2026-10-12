/**
 * Per-recipient projections of the engine state. The server ONLY ever sends these to clients.
 *
 * - owner view:     own board in full (items, placements, abilities) + opponent's PUBLIC board
 * - opponent view:  (same function, other slot)
 * - observer view:  both PUBLIC boards only (the room additionally delays it, see server/room.ts)
 *
 * A PUBLIC board exposes per cell only the public state (unknown/miss/hit/shielded/destroyed),
 * the `revealed` flag, and the item type only for cells of DESTROYED items.
 */
import type { Coord, EnginePhase, ItemId, Orientation, Placement, Slot } from '../types.js';
import type { AbilityState, EngineState, GameOverReason, PlayerStats, PublicCellState } from './state.js';

export interface PublicCell {
	state: PublicCellState;
	revealed: boolean;
	/** Only present when the cell belongs to a destroyed item. */
	item?: ItemId;
}

export interface PublicBoard {
	slot: Slot;
	ready: boolean;
	score: number;
	stats: PlayerStats;
	cells: PublicCell[][];
	destroyedItems: { item: ItemId; cells: Coord[] }[];
	itemsRemaining: number;
}

export interface OwnItem {
	id: ItemId;
	cells: Coord[];
	orientation: Orientation;
	damaged: boolean[];
	destroyed: boolean;
}

export interface OwnBoard {
	slot: Slot;
	placements: Placement[] | null;
	items: OwnItem[];
	abilities: Record<string, AbilityState>;
	extraShots: number;
	/** Full own grid: which item sits where. */
	layout: (ItemId | null)[][];
}

export type Viewer = { kind: 'player'; slot: Slot } | { kind: 'observer' };

export interface VisibleState {
	viewer: Viewer;
	phase: EnginePhase;
	turn: Slot;
	turnNumber: number;
	winner: Slot | null;
	endReason: GameOverReason | null;
	gridSize: number;
	/** Public boards of both players, indexed by slot. */
	boards: [PublicBoard, PublicBoard];
	/** Present only for player viewers. */
	own: OwnBoard | null;
}

export function publicBoard(state: EngineState, slot: Slot): PublicBoard {
	const p = state.players[slot];
	const destroyedAt = new Map<string, ItemId>();
	for (const it of p.items) if (it.destroyed) for (const c of it.cells) destroyedAt.set(`${c.row},${c.col}`, it.id);
	return {
		slot,
		ready: p.ready,
		score: p.score,
		stats: { ...p.stats },
		cells: p.cells.map((row, r) =>
			row.map((c, col) => {
				const out: PublicCell = { state: c.state, revealed: c.revealed };
				const item = destroyedAt.get(`${r},${col}`);
				if (item) out.item = item;
				return out;
			})
		),
		destroyedItems: p.items.filter((i) => i.destroyed).map((i) => ({ item: i.id, cells: i.cells.map((c) => ({ ...c })) })),
		itemsRemaining: p.ready ? p.items.filter((i) => !i.destroyed).length : 0
	};
}

export function ownBoard(state: EngineState, slot: Slot): OwnBoard {
	const p = state.players[slot];
	return {
		slot,
		placements: p.placements ? p.placements.map((x) => ({ ...x })) : null,
		items: p.items.map((i) => ({
			id: i.id,
			cells: i.cells.map((c) => ({ ...c })),
			orientation: i.orientation,
			damaged: [...i.damaged],
			destroyed: i.destroyed
		})),
		abilities: structuredClone(p.abilities),
		extraShots: p.extraShots,
		layout: p.cells.map((row) => row.map((c) => c.item))
	};
}

export function projectView(state: EngineState, viewer: Viewer): VisibleState {
	return {
		viewer,
		phase: state.phase,
		turn: state.turn,
		turnNumber: state.turnNumber,
		winner: state.winner,
		endReason: state.endReason,
		gridSize: state.config.gridSize,
		boards: [publicBoard(state, 0), publicBoard(state, 1)],
		own: viewer.kind === 'player' ? ownBoard(state, viewer.slot) : null
	};
}
