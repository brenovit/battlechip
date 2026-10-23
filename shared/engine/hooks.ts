/**
 * Item hook API. Item definitions (shared/items.ts) implement these optional hooks; the engine
 * (shared/engine/engine.ts) calls them at well-defined points of the shot pipeline / turn flow.
 *
 * Hooks are invoked for EVERY item on the relevant board(s), alive or destroyed; each hook
 * receives `self` (the item instance the hook belongs to) and decides whether to act
 * (e.g. check `self.destroyed`). Hooks mutate state only through `ctx` helpers or through
 * `self.data` / `ctx.state.players[x].effects` (both JSON-serialisable scratch spaces).
 *
 * Call order for a shot (see engine.resolveShot):
 *   1. onBeforeShot(role='attacker') for all attacker items   -> may change shot.target (Latency)
 *   2. onBeforeShot(role='defender') for all defender items   -> may change shot.target (Deflect)
 *   3. getHitsRequired(cell) on all ALIVE defender items      -> max() wins (default 1) (Firewall)
 *   4. onHit for all defender items (if hardware damaged)     -> (Backup repair)
 *   5. onDestroyed for all defender items (if item destroyed) -> (on-destroyed effects)
 *   6. onAfterShot(role='attacker'|'defender') for all items  -> (Hijack reveal)
 * Turn start (after the turn passes to `slot`):
 *   onTurnStart for all items of BOTH boards; ability cooldowns of `slot` tick down first.
 * Battle start:
 *   onGameStart for all items of both boards (initialise self.data).
 */
import type { Coord, ItemId, Slot } from '../types.js';
import type { GameEvent, ShotSource } from '../events.js';
import type { Rng } from '../rng.js';
import type { BoardCell, BoardItem, EngineState } from './state.js';

export interface ShotIntent {
	readonly shotId: number;
	readonly attacker: Slot;
	readonly defender: Slot;
	readonly source: ShotSource;
	readonly originalTarget: Coord;
	/** Mutable: onBeforeShot hooks may redirect the shot. Must stay in bounds. */
	target: Coord;
}

export type ShotOutcome = 'miss' | 'hit' | 'shielded' | 'destroyed' | 'wasted';

export interface ShotResult {
	shotId: number;
	attacker: Slot;
	defender: Slot;
	source: ShotSource;
	originalTarget: Coord;
	target: Coord;
	outcome: ShotOutcome;
	/** The item hit (server-side only; never forwarded as-is to clients). */
	item?: BoardItem;
}

export interface HookContext {
	/** Mutable working copy of the engine state. */
	readonly state: EngineState;
	readonly rng: Rng;
	/** Emit a GameEvent (it will be filtered per recipient by the server). */
	emit(event: GameEvent): void;
	itemAt(board: Slot, cell: Coord): BoardItem | undefined;
	cellAt(board: Slot, cell: Coord): BoardCell;
	inBounds(cell: Coord): boolean;
	/** Cells of `board` that can still be fired at (unknown or shielded). */
	targetableCells(board: Slot): Coord[];
	/** Run a full shot through the pipeline (used by abilities such as Botnet spray). */
	fireShot(attacker: Slot, target: Coord, source: ShotSource): ShotResult;
	/** The current player keeps the turn for `count` more shots (Overload). */
	grantExtraShot(slot: Slot, count?: number): void;
	/** Publicly mark a hardware cell of `board` as revealed and emit `cell_revealed`. */
	revealCell(board: Slot, cell: Coord, beneficiary: Slot, reason: string): void;
	/** Restore a damaged hardware cell to undamaged/unknown. Returns false if not applicable. */
	repairCell(board: Slot, cell: Coord): boolean;
	addScore(slot: Slot, delta: number, reason: string): void;
}

export interface ItemHooks {
	onGameStart?(ctx: HookContext, self: BoardItem): void;
	onTurnStart?(ctx: HookContext, self: BoardItem, info: { slot: Slot; turnNumber: number }): void;
	/** Hits required to expose `cell` on self's board. Return undefined for "no opinion". */
	getHitsRequired?(ctx: HookContext, self: BoardItem, cell: Coord): number | undefined;
	onBeforeShot?(ctx: HookContext, self: BoardItem, shot: ShotIntent, role: 'attacker' | 'defender'): void;
	onHit?(ctx: HookContext, self: BoardItem, info: { item: BoardItem; cell: Coord; shot: ShotIntent }): void;
	onDestroyed?(ctx: HookContext, self: BoardItem, info: { item: BoardItem; shot: ShotIntent }): void;
	onAfterShot?(ctx: HookContext, self: BoardItem, result: ShotResult, role: 'attacker' | 'defender'): void;
}

export interface AbilityDef {
	id: string;
	name: string;
	description: string;
	glyph: string;
	/** Whether the ability needs a target cell on the opponent board. */
	target: 'cell' | 'none';
	/** Owner turns to wait after use. */
	cooldown: number;
	/** null = unlimited. */
	usesPerGame: number | null;
	/** Ability is lost when the owning item is destroyed. */
	requiresAlive: boolean;
	/** Using the ability ends the turn. */
	endsTurn: boolean;
	/** Feature flag: the engine rejects disabled abilities (effects not implemented yet). */
	enabled: boolean;
	execute(ctx: HookContext, self: BoardItem, actor: Slot, target: Coord | undefined): void;
}

export interface ItemDef extends ItemHooks {
	id: ItemId;
	name: string;
	size: number;
	/** Emoji / glyph used as the item icon. */
	glyph: string;
	/** CSS colour accent for the item. */
	accent: string;
	/** Points awarded to the attacker for destroying it. */
	points: number;
	description: string;
	passive: { name: string; description: string };
	onDestroyedEffect: { name: string; description: string };
	abilities?: AbilityDef[];
}
