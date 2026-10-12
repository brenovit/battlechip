import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameRoom, type ObserverSink } from '../server/room';
import { BotPlayer, type Player } from '../server/players';
import { parseClientMessage } from '../server/schemas';
import { commitBoard, cryptoRng, generateGameCode, generateToken, sanitizeName, WindowLimiter } from '../server/security';
import { RoomManager } from '../server/manager';
import { seededRng } from '../shared/rng';
import { randomLayout } from '../shared/placement';
import type { Slot } from '../shared/types';
import type { UpdatePayload } from '../shared/protocol';

class FakePlayer implements Player {
	readonly isBot = false;
	connected = true;
	updates: UpdatePayload[] = [];
	constructor(
		readonly slot: Slot,
		readonly name = `P${slot}`
	) {}
	send() {}
	onUpdate(u: UpdatePayload) {
		this.updates.push(u);
	}
	get last() {
		return this.updates[this.updates.length - 1];
	}
}

function setup() {
	const room = new GameRoom({ code: 'TEST01', rng: seededRng(7), config: { observerDelayTurns: 2 } });
	const a = new FakePlayer(0);
	const b = new FakePlayer(1);
	room.seatPlayer(0, a, 'tok0');
	room.seatPlayer(1, b, 'tok1');
	return { room, a, b };
}

afterEach(() => vi.useRealTimers());

describe('security utils', () => {
	it('cryptoRng produces floats in [0, 1) and ints in [0, max)', () => {
		const rng = cryptoRng();
		for (let i = 0; i < 100; i++) {
			const n = rng.next();
			expect(n).toBeGreaterThanOrEqual(0);
			expect(n).toBeLessThan(1);
			const int = rng.int(10);
			expect(int).toBeGreaterThanOrEqual(0);
			expect(int).toBeLessThan(10);
		}
	});
	it('game codes are 6+ chars from a safe alphabet; tokens are long and unique', () => {
		const codes = new Set(Array.from({ length: 200 }, () => generateGameCode()));
		for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
		expect(codes.size).toBeGreaterThan(195);
		const t = generateToken();
		expect(t.length).toBeGreaterThanOrEqual(32);
		expect(generateToken()).not.toBe(t);
	});
	it('sanitises names', () => {
		expect(sanitizeName('<script>alert(1)</script>')).not.toMatch(/[<>/]/);
		expect(sanitizeName('   ')).toBe('Operator');
		expect(sanitizeName('a'.repeat(50)).length).toBe(20);
	});
	it('fairness commitment is stable and board-sensitive', () => {
		const b = randomLayout(seededRng(1));
		expect(commitBoard(b, 's')).toBe(commitBoard(b, 's'));
		expect(commitBoard(b, 's')).not.toBe(commitBoard(b, 't'));
	});
	it('window limiter blocks bursts', () => {
		const l = new WindowLimiter(3, 60_000);
		expect([1, 2, 3, 4].map(() => l.allow('ip'))).toEqual([true, true, true, false]);
	});
});

describe('schema validation', () => {
	it('accepts valid and rejects unknown / malformed messages', () => {
		expect(parseClientMessage({ type: 'fire', seq: 1, target: { row: 1, col: 2 } }).ok).toBe(true);
		expect(parseClientMessage({ type: 'fire', seq: 1, target: { row: 11, col: 2 } }).ok).toBe(false);
		expect(parseClientMessage({ type: 'fire', seq: 1, target: { row: 1, col: 2 }, slot: 1 }).ok).toBe(false);
		expect(parseClientMessage({ type: 'hack' }).ok).toBe(false);
		expect(parseClientMessage({ type: 'emote', emote: 'free text' }).ok).toBe(false);
		expect(parseClientMessage({ type: 'join', code: 'abc123', name: 'x' }).ok).toBe(true);
	});
});

describe('room', () => {
	it('seq numbers make actions idempotent', () => {
		const { room } = setup();
		const pl = randomLayout(seededRng(3));
		expect(room.submit(0, { type: 'ready', seq: 1, placements: pl }).ok).toBe(true);
		const dup = room.submit(0, { type: 'ready', seq: 1, placements: pl });
		expect(!dup.ok && dup.code).toBe('duplicate');
		room.close();
	});
	it('players never receive the opponent layout; commitments + fairness reveal at end', () => {
		const { room, a, b } = setup();
		room.submit(0, { type: 'ready', seq: 1, placements: randomLayout(seededRng(3)) });
		room.submit(1, { type: 'ready', seq: 1, placements: randomLayout(seededRng(4)) });
		expect(room.state.phase).toBe('battle');
		const ready = a.updates.flatMap((u) => u.events).filter((e) => e.type === 'player_ready');
		expect(ready.every((e) => e.type === 'player_ready' && typeof e.commitment === 'string')).toBe(true);
		// a's view of b's board contains no layout info
		expect(a.last.view!.own!.slot).toBe(0);
		expect(JSON.stringify(a.last.view!.boards[1])).not.toMatch(/database|router/);
		expect(a.last.room.deadline).toBeGreaterThan(Date.now());
		room.forfeit(1, 'forfeit');
		const reveal = b.last.events.find((e) => e.type === 'fairness_reveal');
		expect(reveal).toBeTruthy();
		if (reveal?.type === 'fairness_reveal') {
			const r = reveal.reveal;
			expect(commitBoard(r.placements[0], r.salts[0])).toBe(r.commitments[0]);
		}
		expect(b.last.room.moveLog?.length).toBeGreaterThan(0);
		room.close();
	});
	it('turn timer fires a random shot; repeated timeouts forfeit', () => {
		vi.useFakeTimers();
		const room = new GameRoom({ code: 'T', rng: seededRng(1), config: { turnMs: 1000, maxConsecutiveTimeouts: 3 } });
		room.seatPlayer(0, new FakePlayer(0), null);
		room.seatPlayer(1, new FakePlayer(1), null);
		room.submit(0, { type: 'ready', seq: 1, placements: randomLayout(seededRng(3)) });
		room.submit(1, { type: 'ready', seq: 1, placements: randomLayout(seededRng(4)) });
		const before = room.state.turnNumber;
		vi.advanceTimersByTime(1001);
		expect(room.state.turnNumber).toBe(before + 1);
		expect(room.log.some((e) => e.type === 'turn_timeout')).toBe(true);
		vi.advanceTimersByTime(10_000);
		expect(room.state.phase).toBe('game-over');
		expect(room.state.endReason).toBe('idle');
		room.close();
	});
	it('disconnect grace period then forfeit; reconnect cancels it', () => {
		vi.useFakeTimers();
		const { room } = setup();
		room.disconnect(0);
		expect(room.log.some((e) => e.type === 'player_left')).toBe(true);
		room.reconnect(0);
		vi.advanceTimersByTime(room.cfg.disconnectGraceMs + 1);
		expect(room.state.phase).toBe('placement');
		room.disconnect(1);
		vi.advanceTimersByTime(room.cfg.disconnectGraceMs + 1);
		expect(room.state.phase).toBe('game-over');
		expect(room.state.winner).toBe(0);
		room.close();
	});
	it('observers get no own board and lag behind', () => {
		const { room } = setup();
		const got: UpdatePayload[] = [];
		const o: ObserverSink = { id: 'o', cursor: 0, send: (_e, p) => got.push(p as UpdatePayload) };
		room.addObserver(o);
		expect(room.roomInfo().observerCount).toBe(1);
		room.submit(0, { type: 'ready', seq: 1, placements: randomLayout(seededRng(3)) });
		room.submit(1, { type: 'ready', seq: 1, placements: randomLayout(seededRng(4)) });
		let seq = 2;
		for (let i = 0; i < 6; i++) {
			const t = room.state.turn;
			const target = { row: Math.floor(i / 2) + 5, col: 9 - (i % 2) };
			room.submit(t, { type: 'fire', seq: seq++, target });
		}
		const last = got[got.length - 1];
		expect(last.view!.own).toBeNull();
		expect(last.view!.turnNumber).toBeLessThan(room.state.turnNumber);
		const shots = last.events.concat(...got.map((g) => g.events)).filter((e) => e.type === 'shot_fired');
		expect(shots.every((e) => e.turn <= room.state.turnNumber - 2)).toBe(true);
		room.close();
	});
	it('rematch resets to placement when both request', () => {
		const { room } = setup();
		room.forfeit(0, 'forfeit');
		room.requestRematch(0);
		expect(room.state.phase).toBe('game-over');
		room.requestRematch(1);
		expect(room.state.phase).toBe('placement');
		room.close();
	});
});

describe('vs AI', () => {
	it('bot deploys and plays through the room using the same validation', () => {
		vi.useFakeTimers();
		const room = new GameRoom({ code: 'AI', rng: seededRng(11), vsAi: true, difficulty: 'hard', config: { turnMs: 60_000 } });
		const human = new FakePlayer(0);
		room.seatPlayer(0, human, null);
		const bot = new BotPlayer(1, 'BOT', 'hard', room, seededRng(12), { minDelayMs: 600, maxDelayMs: 1500 });
		room.seatPlayer(1, bot, null);
		vi.advanceTimersByTime(1600);
		expect(room.state.players[1].ready).toBe(true);
		room.submit(0, { type: 'ready', seq: 1, placements: randomLayout(seededRng(3)) });
		let seq = 2;
		for (let i = 0; i < 400 && room.state.phase === 'battle'; i++) {
			if (room.state.turn === 0) {
				const v = human.last.view!;
				const cells: { row: number; col: number }[] = [];
				v.boards[1].cells.forEach((r, row) => r.forEach((c, col) => c.state === 'unknown' && cells.push({ row, col })));
				room.submit(0, { type: 'fire', seq: seq++, target: cells[0] });
			} else vi.advanceTimersByTime(1600);
		}
		expect(room.state.phase).toBe('game-over');
		room.close();
	});
});

describe('manager', () => {
	it('creates rooms with unique codes and cleans up sessions on close', () => {
		const m = new RoomManager(seededRng(1));
		const r = m.createRoom();
		expect(m.rooms.get(r.code)).toBe(r);
		r.tokens[0] = 'x'.repeat(32);
		m.sessions.set(r.tokens[0], { code: r.code, slot: 0 });
		r.close();
		expect(m.rooms.size).toBe(0);
		expect(m.sessions.size).toBe(0);
		m.dispose();
	});
});
