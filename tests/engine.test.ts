import { describe, expect, it } from 'vitest';
import { validatePlacements, randomLayout } from '../shared/placement';
import { applyAction, createInitialState, targetableCells } from '../shared/engine/engine';
import { projectView } from '../shared/engine/view';
import { seededRng } from '../shared/rng';
import type { Placement, Slot } from '../shared/types';
import type { EngineState } from '../shared/engine/state';
import { eventVisibleTo, type GameEvent } from '../shared/events';
import { easyBot, hardBot, mediumBot } from '../server/bot/strategies';
import { runHeadlessGame } from '../server/sim/headless';

const LAYOUT: Placement[] = [
	{ item: 'database', row: 0, col: 0, orientation: 'horizontal' },
	{ item: 'backup', row: 1, col: 0, orientation: 'horizontal' },
	{ item: 'server', row: 2, col: 0, orientation: 'horizontal' },
	{ item: 'firewall', row: 3, col: 0, orientation: 'horizontal' },
	{ item: 'iot-cluster', row: 4, col: 0, orientation: 'horizontal' },
	{ item: 'router', row: 5, col: 0, orientation: 'horizontal' }
];

function battleState(seed = 1): EngineState {
	const rng = seededRng(seed);
	let s = createInitialState();
	for (const slot of [0, 1] as Slot[]) {
		const r = applyAction(s, { type: 'ready', slot, placements: LAYOUT }, rng);
		expect(r.ok).toBe(true);
		s = r.state;
	}
	return s;
}

describe('placement validation', () => {
	it('accepts a full valid layout', () => {
		expect(validatePlacements(LAYOUT).ok).toBe(true);
	});
	it('rejects out of bounds, overlap, missing, duplicate, non-integer, bad orientation', () => {
		const codes = (p: unknown) => validatePlacements(p).errors.map((e) => e.code);
		expect(codes(LAYOUT.map((p, i) => (i === 0 ? { ...p, col: 7 } : p)))).toContain('out-of-bounds');
		expect(codes(LAYOUT.map((p, i) => (i === 1 ? { ...p, row: 0 } : p)))).toContain('overlap');
		expect(codes(LAYOUT.slice(1))).toContain('missing-item');
		expect(codes([...LAYOUT, LAYOUT[0]])).toContain('duplicate-item');
		expect(codes(LAYOUT.map((p, i) => (i === 0 ? { ...p, row: 0.5 } : p)))).toContain('bad-coords');
		expect(codes(LAYOUT.map((p, i) => (i === 0 ? { ...p, orientation: 'diagonal' } : p)))).toContain('bad-orientation');
		expect(codes('nope')).toContain('not-array');
	});
	it('random layouts are always valid', () => {
		const rng = seededRng(42);
		for (let i = 0; i < 50; i++) expect(validatePlacements(randomLayout(rng)).ok).toBe(true);
	});
	it('engine rejects invalid placement and locks board after ready', () => {
		const rng = seededRng(1);
		const s0 = createInitialState();
		expect(applyAction(s0, { type: 'ready', slot: 0, placements: LAYOUT.slice(1) }, rng).ok).toBe(false);
		const s1 = applyAction(s0, { type: 'ready', slot: 0, placements: LAYOUT }, rng);
		expect(s1.ok).toBe(true);
		const again = applyAction(s1.state, { type: 'ready', slot: 0, placements: randomLayout(rng) }, rng);
		expect(again.ok).toBe(false);
		if (!again.ok) expect(again.error.code).toBe('already-ready');
	});
});

describe('action validation & turn flow', () => {
	it('starts battle after both ready and emits turn events', () => {
		const s = battleState();
		expect(s.phase).toBe('battle');
		expect(s.turnNumber).toBe(1);
	});
	it('rejects wrong turn, out of bounds, already shot, wrong phase', () => {
		const rng = seededRng(2);
		const s = battleState();
		const me = s.turn;
		const other = (1 - me) as Slot;
		const wrong = applyAction(s, { type: 'fire', slot: other, target: { row: 0, col: 0 } }, rng);
		expect(!wrong.ok && wrong.error.code).toBe('not-your-turn');
		const oob = applyAction(s, { type: 'fire', slot: me, target: { row: 10, col: 0 } }, rng);
		expect(!oob.ok && oob.error.code).toBe('out-of-bounds');
		const r1 = applyAction(s, { type: 'fire', slot: me, target: { row: 9, col: 9 } }, rng);
		expect(r1.ok).toBe(true);
		expect(r1.state.turn).toBe(other);
		const r2 = applyAction(r1.state, { type: 'fire', slot: other, target: { row: 9, col: 9 } }, rng);
		const r3 = applyAction(r2.state, { type: 'fire', slot: me, target: { row: 9, col: 9 } }, rng);
		expect(!r3.ok && r3.error.code).toBe('already-shot');
		const pre = applyAction(createInitialState(), { type: 'fire', slot: 0, target: { row: 0, col: 0 } }, rng);
		expect(!pre.ok && pre.error.code).toBe('wrong-phase');
	});
	it('does not mutate input state and is deterministic', () => {
		const s = battleState();
		const snapshot = JSON.stringify(s);
		const a = applyAction(s, { type: 'timeout', slot: s.turn }, seededRng(9));
		const b = applyAction(s, { type: 'timeout', slot: s.turn }, seededRng(9));
		expect(JSON.stringify(s)).toBe(snapshot);
		expect(a.events).toEqual(b.events);
	});
	it('hit, destroy and win', () => {
		const rng = seededRng(3);
		let s = battleState();
		const attacker = s.turn;
		const def = (1 - attacker) as Slot;
		const events: GameEvent[] = [];
		let missCol = 0;
		const targets = LAYOUT.flatMap((p) => Array.from({ length: { database: 5, backup: 4, server: 4, firewall: 3, 'iot-cluster': 3, router: 2 }[p.item] }, (_, i) => ({ row: p.row, col: p.col + i })));
		while (s.phase === 'battle') {
			if (s.turn === attacker) {
				const unhit = targets.find((t) => {
					const c = s.players[def].cells[t.row][t.col];
					return c.state === 'unknown' || c.state === 'shielded';
				});
				if (!unhit) break;
				const r = applyAction(s, { type: 'fire', slot: attacker, target: unhit }, rng);
				expect(r.ok).toBe(true);
				events.push(...r.events);
				s = r.state;
			} else {
				const defTarget = targetableCells(s, attacker)[0];
				const r = applyAction(s, { type: 'fire', slot: def, target: defTarget }, rng);
				expect(r.ok).toBe(true);
				s = r.state;
			}
		}
		expect(s.phase).toBe('game-over');
		expect(s.winner).toBe(attacker);
		expect(events.filter((e) => e.type === 'item_destroyed')).toHaveLength(6);
		expect(events.some((e) => e.type === 'game_over')).toBe(true);
	});
	it('timeout fires a random shot and passes the turn', () => {
		const s = battleState();
		const r = applyAction(s, { type: 'timeout', slot: s.turn }, seededRng(5));
		expect(r.ok).toBe(true);
		expect(r.events.some((e) => e.type === 'shot_fired' && e.source === 'timeout')).toBe(true);
		expect(r.state.turn).not.toBe(s.turn);
	});
	it('disabled or unknown abilities are rejected', () => {
		const s = battleState();
		const r = applyAction(s, { type: 'ability', slot: s.turn, ability: 'emp', target: { row: 1, col: 1 } }, seededRng(1));
		expect(r.ok).toBe(false);
	});
	it('enabled abilities work when conditions met', () => {
		const s = battleState();
		const r = applyAction(s, { type: 'ability', slot: s.turn, ability: 'ping', target: { row: 1, col: 1 } }, seededRng(1));
		expect(r.ok).toBe(true);
		expect(r.events.some((e) => e.type === 'ping_result')).toBe(true);
	});
});

describe('view filtering', () => {
	it('opponent / observer views never contain hidden item positions', () => {
		let s = battleState();
		s = applyAction(s, { type: 'fire', slot: s.turn, target: { row: 0, col: 0 } }, seededRng(1)).state; // a hit
		const me = s.turn; // turn has passed
		const viewer = (1 - me) as Slot;
		const v = projectView(s, { kind: 'player', slot: viewer });
		const opp = v.boards[me];
		const json = JSON.stringify(opp);
		for (const id of ['database', 'backup', 'server', 'firewall', 'iot-cluster', 'router']) expect(json).not.toContain(id);
		expect(v.own?.slot).toBe(viewer);
		expect(JSON.stringify(v.own)).toContain('database');
		const ov = projectView(s, { kind: 'observer' });
		expect(ov.own).toBeNull();
		expect(JSON.stringify(ov.boards)).not.toMatch(/database|backup|server|firewall|iot-cluster|router/);
	});
	it('private events are filtered per audience', () => {
		const ping: GameEvent = { type: 'ping_result', actor: 0, center: { row: 1, col: 1 }, count: 2 };
		expect(eventVisibleTo(ping, { kind: 'player', slot: 0 })).toBe(true);
		expect(eventVisibleTo(ping, { kind: 'player', slot: 1 })).toBe(false);
		expect(eventVisibleTo(ping, { kind: 'observer' })).toBe(true);
		const rr: GameEvent = { type: 'rematch_requested', slot: 0 };
		expect(eventVisibleTo(rr, { kind: 'observer' })).toBe(false);
	});
});

describe('headless bots', () => {
	it('easy vs easy terminates with a winner', () => {
		for (let seed = 0; seed < 10; seed++) {
			const r = runHeadlessGame([easyBot, easyBot], seed);
			expect(r.state.phase).toBe('game-over');
			expect(r.winner).not.toBeNull();
			expect(r.rejected).toBe(0);
		}
	});

	it('medium vs easy terminates with a winner', () => {
		for (let seed = 0; seed < 5; seed++) {
			const r = runHeadlessGame([mediumBot, easyBot], seed + 100);
			expect(r.state.phase).toBe('game-over');
			expect(r.winner).not.toBeNull();
			expect(r.rejected).toBe(0);
		}
	});

	it('hard vs medium terminates with a winner', () => {
		for (let seed = 0; seed < 5; seed++) {
			const r = runHeadlessGame([hardBot, mediumBot], seed + 200);
			expect(r.state.phase).toBe('game-over');
			expect(r.winner).not.toBeNull();
			expect(r.rejected).toBe(0);
		}
	});
});

describe('powerup abilities and passives', () => {
	it('ping ability returns hardware count in 3x3 area', () => {
		const s = battleState();
		// Database is at row 0, col 0..4, Backup is at row 1, col 0..3
		// Center at (0, 1): covering (0,0), (0,1), (0,2), (1,0), (1,1), (1,2) -> at least 6 hardware cells
		const r = applyAction(s, { type: 'ability', slot: s.turn, ability: 'ping', target: { row: 0, col: 1 } }, seededRng(1));
		expect(r.ok).toBe(true);
		const pingEv = r.events.find((e) => e.type === 'ping_result');
		expect(pingEv).toBeDefined();
		if (pingEv && pingEv.type === 'ping_result') {
			expect(pingEv.count).toBeGreaterThanOrEqual(5);
		}
	});

	it('botnet spray fires 3 shots in one turn', () => {
		const s = battleState();
		const r = applyAction(s, { type: 'ability', slot: s.turn, ability: 'botnet' }, seededRng(1));
		expect(r.ok).toBe(true);
		expect(r.events.some((e) => e.type === 'botnet_spray')).toBe(true);
		const shots = r.events.filter((e) => e.type === 'shot_fired' && e.source === 'botnet');
		expect(shots).toHaveLength(3);
	});

	it('firewall adjacent cells require 2 hits (shielded on first hit)', () => {
		const s = battleState();
		// In LAYOUT: Server is at row 2, col 0..3. Firewall is at row 3, col 0..2.
		// Cell (2, 0) is Server, which is adjacent to Firewall cell (3, 0).
		const r = applyAction(s, { type: 'fire', slot: s.turn, target: { row: 2, col: 0 } }, seededRng(10));
		expect(r.ok).toBe(true);
		// With Firewall alive, adjacent cell requires 2 hits: should be shielded or deflected
		const hasShield = r.events.some((e) => e.type === 'shielded');
		const hasDeflect = r.events.some((e) => e.type === 'deflect');
		expect(hasShield || hasDeflect).toBe(true);
	});
});
