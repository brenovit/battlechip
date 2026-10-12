/**
 * Pure, deterministic game engine.
 *
 *   applyAction(state, action, rng) -> { ok, state, events }
 *
 * - Never mutates the input state (works on a structuredClone).
 * - All randomness comes from the injected `rng` (server: crypto RNG; tests/sims: seededRng).
 * - Validates every action (phase, turn, bounds, already-shot, placement inventory...).
 * - Calls item hooks (shared/items.ts) at the points documented in ./hooks.ts.
 */
import { GRID_SIZE, inBounds, otherSlot, type Coord, type Placement, type Slot } from '../types.js';
import { ITEMS, getAbility, abilityOwner } from '../items.js';
import { normalizePlacements, placementCells, validatePlacements } from '../placement.js';
import type { Rng } from '../rng.js';
import type { GameEvent, ShotSource } from '../events.js';
import type { HookContext, ItemHooks, ShotIntent, ShotResult } from './hooks.js';
import {
	DEFAULT_ENGINE_CONFIG,
	type BoardCell,
	type BoardItem,
	type EngineAction,
	type EngineConfig,
	type EngineError,
	type EngineErrorCode,
	type EnginePlayer,
	type EngineResult,
	type EngineState,
	type GameOverReason,
	type PlayerStats
} from './state.js';

export function emptyStats(): PlayerStats {
	return { shots: 0, hits: 0, misses: 0, itemsDestroyed: 0, itemsLost: 0, turns: 0, timeouts: 0, abilitiesUsed: 0 };
}

function emptyBoard(size: number): BoardCell[][] {
	return Array.from({ length: size }, () =>
		Array.from({ length: size }, () => ({ item: null, shots: 0, state: 'unknown' as const, revealed: false }))
	);
}

function newPlayer(slot: Slot, size: number): EnginePlayer {
	return {
		slot,
		ready: false,
		placements: null,
		cells: emptyBoard(size),
		items: [],
		score: 0,
		stats: emptyStats(),
		abilities: {},
		extraShots: 0,
		effects: {}
	};
}

export function createInitialState(config: Partial<EngineConfig> = {}): EngineState {
	const cfg = { ...DEFAULT_ENGINE_CONFIG, ...config };
	return {
		config: cfg,
		phase: 'placement',
		turn: 0,
		turnNumber: 0,
		players: [newPlayer(0, cfg.gridSize), newPlayer(1, cfg.gridSize)],
		winner: null,
		endReason: null,
		nextShotId: 1
	};
}

/** Cells of `board` that can still be fired at (never shot / shielded). */
export function targetableCells(state: EngineState, board: Slot): Coord[] {
	const out: Coord[] = [];
	const cells = state.players[board].cells;
	for (let row = 0; row < cells.length; row++)
		for (let col = 0; col < cells.length; col++) {
			const s = cells[row][col].state;
			if (s === 'unknown' || s === 'shielded') out.push({ row, col });
		}
	return out;
}

class ActionError extends Error {
	constructor(
		public code: EngineErrorCode,
		message: string
	) {
		super(message);
	}
}

const fail = (code: EngineErrorCode, message: string): never => {
	throw new ActionError(code, message);
};

/** Engine context for one applyAction call. */
class Ctx implements HookContext {
	events: GameEvent[] = [];
	constructor(
		public state: EngineState,
		public rng: Rng
	) {}

	emit(e: GameEvent) {
		this.events.push(e);
	}
	inBounds(c: Coord) {
		return inBounds(c, this.state.config.gridSize);
	}
	cellAt(board: Slot, c: Coord) {
		return this.state.players[board].cells[c.row][c.col];
	}
	itemAt(board: Slot, c: Coord) {
		return this.state.players[board].items.find((it) => it.cells.some((x) => x.row === c.row && x.col === c.col));
	}
	targetableCells(board: Slot) {
		return targetableCells(this.state, board);
	}

	/** Call hook `name` on every item of the given boards. */
	callHooks<K extends keyof ItemHooks>(
		boards: Slot[],
		name: K,
		invoke: (fn: NonNullable<ItemHooks[K]>, item: BoardItem) => void
	) {
		for (const b of boards)
			for (const item of this.state.players[b].items) {
				const fn = ITEMS[item.id][name];
				if (fn) invoke(fn as NonNullable<ItemHooks[K]>, item);
			}
	}

	grantExtraShot(slot: Slot, count = 1) {
		this.state.players[slot].extraShots += count;
	}

	revealCell(board: Slot, cell: Coord, beneficiary: Slot, reason: string) {
		const c = this.cellAt(board, cell);
		c.revealed = true;
		this.emit({ type: 'cell_revealed', actor: beneficiary, owner: board, cell: { ...cell }, reason });
	}

	repairCell(board: Slot, cell: Coord) {
		const item = this.itemAt(board, cell);
		if (!item || item.destroyed) return false;
		const idx = item.cells.findIndex((x) => x.row === cell.row && x.col === cell.col);
		if (!item.damaged[idx]) return false;
		item.damaged[idx] = false;
		const c = this.cellAt(board, cell);
		c.state = 'unknown';
		c.shots = 0;
		this.emit({ type: 'repair', owner: board, cell: { ...cell } });
		return true;
	}

	addScore(slot: Slot, delta: number, reason: string) {
		const p = this.state.players[slot];
		p.score += delta;
		this.emit({ type: 'score_changed', slot, score: p.score, delta, reason });
	}

	fireShot(attacker: Slot, target: Coord, source: ShotSource): ShotResult {
		const state = this.state;
		const defender = otherSlot(attacker);
		const shotId = state.nextShotId++;
		const intent: ShotIntent = { shotId, attacker, defender, source, originalTarget: { ...target }, target: { ...target } };
		const att = state.players[attacker];
		att.stats.shots++;
		this.emit({ type: 'shot_fired', actor: attacker, target: { ...target }, shotId, source });

		this.callHooks([attacker], 'onBeforeShot', (fn, self) => fn(this, self, intent, 'attacker'));
		this.callHooks([defender], 'onBeforeShot', (fn, self) => fn(this, self, intent, 'defender'));
		if (!this.inBounds(intent.target)) intent.target = { ...intent.originalTarget };

		const t = intent.target;
		const result: ShotResult = {
			shotId,
			attacker,
			defender,
			source,
			originalTarget: intent.originalTarget,
			target: { ...t },
			outcome: 'miss'
		};
		const cell = this.cellAt(defender, t);

		if (cell.state !== 'unknown' && cell.state !== 'shielded') {
			result.outcome = 'wasted';
			this.emit({ type: 'shot_wasted', actor: attacker, target: { ...t }, shotId });
		} else {
			cell.shots++;
			const item = this.itemAt(defender, t);
			if (!item) {
				cell.state = 'miss';
				att.stats.misses++;
				this.emit({ type: 'miss', actor: attacker, target: { ...t }, shotId });
			} else {
				let required = 1;
				for (const it of state.players[defender].items) {
					if (it.destroyed) continue;
					const r = ITEMS[it.id].getHitsRequired?.(this, it, t);
					if (r !== undefined && r > required) required = r;
				}
				if (cell.shots < required) {
					cell.state = 'shielded';
					result.outcome = 'shielded';
					this.emit({ type: 'shielded', actor: attacker, target: { ...t }, shotId, hitsRemaining: required - cell.shots });
				} else {
					result.outcome = 'hit';
					result.item = item;
					cell.state = 'hit';
					item.damaged[item.cells.findIndex((x) => x.row === t.row && x.col === t.col)] = true;
					att.stats.hits++;
					this.emit({ type: 'hit', actor: attacker, target: { ...t }, shotId });
					this.addScore(attacker, state.config.hitPoints, 'hit');
					this.callHooks([defender], 'onHit', (fn, self) => fn(this, self, { item, cell: { ...t }, shot: intent }));
					if (item.damaged.every(Boolean) && !item.destroyed) {
						item.destroyed = true;
						result.outcome = 'destroyed';
						for (const c of item.cells) this.cellAt(defender, c).state = 'destroyed';
						att.stats.itemsDestroyed++;
						state.players[defender].stats.itemsLost++;
						this.emit({
							type: 'item_destroyed',
							actor: attacker,
							owner: defender,
							item: item.id,
							cells: item.cells.map((c) => ({ ...c }))
						});
						this.addScore(attacker, ITEMS[item.id].points, 'destroyed');
						this.callHooks([defender], 'onDestroyed', (fn, self) => fn(this, self, { item, shot: intent }));
					}
				}
			}
		}
		this.callHooks([attacker], 'onAfterShot', (fn, self) => fn(this, self, result, 'attacker'));
		this.callHooks([defender], 'onAfterShot', (fn, self) => fn(this, self, result, 'defender'));
		this.checkWin(attacker);
		return result;
	}

	checkWin(attacker: Slot) {
		if (this.state.phase !== 'battle') return;
		const def = this.state.players[otherSlot(attacker)];
		if (def.items.length > 0 && def.items.every((i) => i.destroyed)) this.endGame(attacker, 'all-destroyed');
	}

	endGame(winner: Slot, reason: GameOverReason) {
		const s = this.state;
		if (s.phase === 'game-over') return;
		s.phase = 'game-over';
		s.winner = winner;
		s.endReason = reason;
		this.emit({ type: 'phase_changed', phase: 'game-over' });
		this.emit({
			type: 'game_over',
			winner,
			reason,
			stats: [{ ...s.players[0].stats }, { ...s.players[1].stats }],
			scores: [s.players[0].score, s.players[1].score]
		});
	}

	/** End the current player's turn (unless they hold extra shots). */
	endTurn(force = false) {
		const s = this.state;
		if (s.phase !== 'battle') return;
		const cur = s.players[s.turn];
		if (!force && cur.extraShots > 0) {
			cur.extraShots--;
			return;
		}
		cur.extraShots = 0;
		cur.stats.turns++;
		s.turn = otherSlot(s.turn);
		s.turnNumber++;
		this.startTurn();
	}

	startTurn() {
		const s = this.state;
		for (const a of Object.values(s.players[s.turn].abilities)) if (a.cooldown > 0) a.cooldown--;
		this.emit({ type: 'turn_changed', slot: s.turn, turnNumber: s.turnNumber });
		const info = { slot: s.turn, turnNumber: s.turnNumber };
		this.callHooks([0, 1], 'onTurnStart', (fn, self) => fn(this, self, info));
	}
}

function buildBoard(p: EnginePlayer, placements: Placement[]) {
	p.placements = placements;
	p.items = placements.map((pl) => {
		const cells = placementCells(pl);
		for (const c of cells) p.cells[c.row][c.col].item = pl.item;
		return {
			id: pl.item,
			owner: p.slot,
			cells,
			orientation: pl.orientation,
			damaged: cells.map(() => false),
			destroyed: false,
			data: {}
		};
	});
	p.abilities = {};
	for (const it of placements)
		for (const ab of ITEMS[it.item].abilities ?? []) p.abilities[ab.id] = { cooldown: 0, usesLeft: ab.usesPerGame };
}

function requireBattleTurn(state: EngineState, slot: Slot) {
	if (state.phase !== 'battle') fail('wrong-phase', 'Not in battle phase');
	if (state.turn !== slot) fail('not-your-turn', 'Not your turn');
}

function validTarget(state: EngineState, target: Coord, board: Slot) {
	if (!target || !inBounds(target, state.config.gridSize)) fail('out-of-bounds', 'Target out of bounds');
	const c = state.players[board].cells[target.row][target.col];
	if (c.state !== 'unknown' && c.state !== 'shielded') fail('already-shot', 'Cell already shot');
}

function run(ctx: Ctx, action: EngineAction) {
	const state = ctx.state;
	if (action.slot !== 0 && action.slot !== 1) fail('invalid-action', 'Invalid slot');
	switch (action.type) {
		case 'ready': {
			if (state.phase !== 'placement') fail('wrong-phase', 'Not in placement phase');
			const p = state.players[action.slot];
			if (p.ready) fail('already-ready', 'Board already locked');
			const v = validatePlacements(action.placements, state.config.gridSize);
			if (!v.ok) fail('invalid-placement', v.errors.map((e) => e.message).join('; '));
			buildBoard(p, normalizePlacements(action.placements));
			p.ready = true;
			ctx.emit({ type: 'player_ready', slot: action.slot });
			if (state.players.every((x) => x.ready)) {
				state.phase = 'battle';
				state.turn = ctx.rng.int(2) as Slot;
				state.turnNumber = 1;
				ctx.emit({ type: 'phase_changed', phase: 'battle' });
				ctx.emit({ type: 'battle_started', firstTurn: state.turn });
				ctx.callHooks([0, 1], 'onGameStart', (fn, self) => fn(ctx, self));
				ctx.startTurn();
			}
			return;
		}
		case 'fire': {
			requireBattleTurn(state, action.slot);
			validTarget(state, action.target, otherSlot(action.slot));
			const extra = state.players[action.slot].extraShots > 0;
			ctx.fireShot(action.slot, { row: action.target.row, col: action.target.col }, extra ? 'extra' : 'normal');
			ctx.endTurn();
			return;
		}
		case 'timeout': {
			requireBattleTurn(state, action.slot);
			const options = targetableCells(state, otherSlot(action.slot));
			state.players[action.slot].stats.timeouts++;
			ctx.emit({ type: 'turn_timeout', slot: action.slot });
			if (options.length > 0) ctx.fireShot(action.slot, options[ctx.rng.int(options.length)], 'timeout');
			ctx.endTurn(true);
			return;
		}
		case 'ability': {
			requireBattleTurn(state, action.slot);
			const def = getAbility(action.ability);
			const ownerItem = abilityOwner(action.ability);
			if (!def || !ownerItem) return fail('unknown-ability', 'Unknown ability');
			const p = state.players[action.slot];
			const st = p.abilities[def.id];
			const self = p.items.find((i) => i.id === ownerItem);
			if (!def.enabled || !st || !self) fail('ability-unavailable', 'Ability unavailable');
			if (def.requiresAlive && self!.destroyed) fail('ability-unavailable', 'Item destroyed');
			if (st.cooldown > 0) fail('ability-on-cooldown', 'Ability on cooldown');
			if (st.usesLeft !== null && st.usesLeft <= 0) fail('ability-unavailable', 'No uses left');
			if (def.target === 'cell') {
				if (!action.target || !inBounds(action.target, state.config.gridSize)) fail('invalid-target', 'Invalid target');
			}
			const target = def.target === 'cell' ? { row: action.target!.row, col: action.target!.col } : undefined;
			ctx.emit({ type: 'ability_used', actor: action.slot, ability: def.id, target });
			p.stats.abilitiesUsed++;
			st.cooldown = def.cooldown;
			if (st.usesLeft !== null) st.usesLeft--;
			def.execute(ctx, self!, action.slot, target);
			if (def.endsTurn) ctx.endTurn();
			return;
		}
		case 'forfeit': {
			if (state.phase === 'game-over') fail('wrong-phase', 'Game already over');
			if (state.phase === 'placement') state.phase = 'battle'; // allow endGame from placement
			ctx.endGame(otherSlot(action.slot), action.reason);
			return;
		}
		default:
			fail('invalid-action', 'Unknown action');
	}
}

export function applyAction(state: EngineState, action: EngineAction, rng: Rng): EngineResult {
	const ctx = new Ctx(structuredClone(state), rng);
	try {
		run(ctx, action);
	} catch (e) {
		if (e instanceof ActionError) {
			const error: EngineError = { code: e.code, message: e.message };
			return { ok: false, error, state, events: [] };
		}
		throw e;
	}
	return { ok: true, state: ctx.state, events: ctx.events };
}

export { GRID_SIZE };
