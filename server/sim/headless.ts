/**
 * Headless game runner: two bot strategies play through the pure engine using only their
 * VisibleState. Used by tests and by the simulation harness (Gameplay Engine agent extends it).
 */
import { applyAction, createInitialState } from '../../shared/engine/engine.js';
import { projectView } from '../../shared/engine/view.js';
import { seededRng, type Rng } from '../../shared/rng.js';
import type { Slot } from '../../shared/types.js';
import type { GameEvent } from '../../shared/events.js';
import type { EngineAction, EngineState } from '../../shared/engine/state.js';
import type { BotStrategy } from '../bot/strategies.js';

export interface HeadlessResult {
	winner: Slot | null;
	turns: number;
	state: EngineState;
	events: GameEvent[];
	rejected: number;
}

export function runHeadlessGame(
	bots: [BotStrategy, BotStrategy],
	seed: number | string,
	opts: { maxActions?: number; rng?: Rng } = {}
): HeadlessResult {
	const rng = opts.rng ?? seededRng(seed);
	let state = createInitialState();
	const events: GameEvent[] = [];
	let rejected = 0;
	const apply = (a: EngineAction) => {
		const r = applyAction(state, a, rng);
		if (!r.ok) {
			rejected++;
			return false;
		}
		state = r.state;
		events.push(...r.events);
		return true;
	};
	for (const slot of [0, 1] as Slot[]) apply({ type: 'ready', slot, placements: bots[slot].deploy(rng, state.config.gridSize) });
	const max = opts.maxActions ?? 1000;
	for (let i = 0; i < max && state.phase === 'battle'; i++) {
		const slot = state.turn;
		const view = projectView(state, { kind: 'player', slot });
		const move = bots[slot].chooseMove(view, rng);
		const ok = apply(move.type === 'fire' ? { type: 'fire', slot, target: move.target } : { ...move, type: 'ability', slot });
		if (!ok) apply({ type: 'timeout', slot }); // invalid bot move: treated like a timeout
	}
	return { winner: state.winner, turns: state.turnNumber, state, events, rejected };
}
