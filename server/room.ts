/**
 * GameRoom: owns one engine state, the seats (Player), observers, timers and the move log.
 * Socket-agnostic (testable): sockets are wrapped by HumanPlayer / ObserverSink.
 */
import { applyAction, createInitialState } from '../shared/engine/engine.js';
import { projectView, type VisibleState } from '../shared/engine/view.js';
import type { EngineAction, EngineState, GameOverReason } from '../shared/engine/state.js';
import { EVENT_AUDIENCE, OBSERVER_LIVE_EVENTS, eventVisibleTo, type GameEvent, type Recipient, type StampedEvent } from '../shared/events.js';
import { otherSlot, type Difficulty, type EmoteId, type Phase, type Slot } from '../shared/types.js';
import { randomLayout } from '../shared/placement.js';
import type { Rng } from '../shared/rng.js';
import type { RoomInfo, UpdatePayload } from '../shared/protocol.js';
import { CONFIG } from './config.js';
import { commitBoard, newSalt } from './security.js';
import type { Player, RoomPort, SeatAction } from './players.js';

export interface ObserverSink {
	id: string;
	send(event: string, payload: unknown): void;
	/** eid of the last delayed event delivered. */
	cursor: number;
}

export interface RoomOptions {
	code: string;
	rng: Rng;
	vsAi?: boolean;
	difficulty?: Difficulty | null;
	config?: Partial<typeof CONFIG>;
	now?: () => number;
	onClosed?: (room: GameRoom) => void;
}

type Timer = ReturnType<typeof setTimeout>;

export class GameRoom implements RoomPort {
	readonly code: string;
	readonly vsAi: boolean;
	readonly difficulty: Difficulty | null;
	readonly cfg: typeof CONFIG;
	readonly createdAt: number;
	private rng: Rng;
	private now: () => number;
	private onClosed?: (room: GameRoom) => void;

	state: EngineState = createInitialState();
	players: [Player | null, Player | null] = [null, null];
	tokens: [string | null, string | null] = [null, null];
	observers = new Map<string, ObserverSink>();
	log: StampedEvent[] = [];
	private eid = 0;
	private lastSeq: [number, number] = [0, 0];
	private salts: [string, string] = [newSalt(), newSalt()];
	private commitments: [string, string] = ['', ''];
	private rematch = new Set<Slot>();
	private consecutiveTimeouts: [number, number] = [0, 0];
	private lastEmote: [number, number] = [0, 0];
	private deadline: number | null = null;
	private turnTimer: Timer | null = null;
	private timerTurnKey = '';
	private graceTimers: [Timer | null, Timer | null] = [null, null];
	private observerSnapshots: { turn: number; view: VisibleState }[] = [];
	closed = false;
	finishedAt: number | null = null;

	constructor(opts: RoomOptions) {
		this.code = opts.code;
		this.rng = opts.rng;
		this.vsAi = !!opts.vsAi;
		this.difficulty = opts.vsAi ? (opts.difficulty ?? 'easy') : null;
		this.cfg = { ...CONFIG, ...opts.config };
		this.now = opts.now ?? Date.now;
		this.onClosed = opts.onClosed;
		this.createdAt = this.now();
	}

	// ---------------------------------------------------------------- info / views
	get phase(): Phase {
		return this.players[1] === null || this.players[0] === null ? 'lobby' : this.state.phase;
	}

	roomInfo(includeLog = false): RoomInfo {
		const seat = (s: Slot) => {
			const p = this.players[s];
			return p ? { slot: s, name: p.name, isBot: p.isBot, connected: p.connected, ready: this.state.players[s].ready } : null;
		};
		return {
			code: this.code,
			phase: this.phase,
			players: [seat(0), seat(1)],
			observerCount: this.observers.size,
			deadline: this.deadline,
			turnDurationMs: this.cfg.turnMs,
			rematchRequests: [...this.rematch],
			vsAi: this.vsAi,
			difficulty: this.difficulty,
			observerDelayTurns: this.cfg.observerDelayTurns,
			moveLog: includeLog && this.state.phase === 'game-over' ? this.log : undefined
		};
	}

	private viewFor(r: Recipient): VisibleState | null {
		if (this.phase === 'lobby') return null;
		return projectView(this.state, r.kind === 'player' ? { kind: 'player', slot: r.slot } : { kind: 'observer' });
	}

	/** Observer view lags `observerDelayTurns` turns behind during battle. */
	private observerView(): VisibleState | null {
		if (this.phase === 'lobby') return null;
		if (this.state.phase !== 'battle') return this.viewFor({ kind: 'observer' });
		const limit = this.state.turnNumber - this.cfg.observerDelayTurns;
		let best: VisibleState | null = null;
		for (const s of this.observerSnapshots) if (s.turn <= limit) best = s.view;
		return best ?? this.observerSnapshots[0]?.view ?? this.viewFor({ kind: 'observer' });
	}

	private observerEvents(o: ObserverSink, fresh: StampedEvent[]): StampedEvent[] {
		const out: StampedEvent[] = [];
		const ended = this.state.phase !== 'battle';
		const limit = this.state.turnNumber - this.cfg.observerDelayTurns;
		// Live events (presence etc.) go out immediately.
		for (const e of fresh) if (OBSERVER_LIVE_EVENTS.has(e.type) && eventVisibleTo(e, { kind: 'observer' })) out.push(e);
		// Delayed events: everything up to the delay limit (or everything once the battle is over).
		for (const e of this.log) {
			if (e.eid <= o.cursor) continue;
			if (!ended && e.turn > limit) break;
			o.cursor = e.eid;
			if (!OBSERVER_LIVE_EVENTS.has(e.type) && eventVisibleTo(e, { kind: 'observer' })) out.push(e);
		}
		return out.sort((a, b) => a.eid - b.eid);
	}

	// ---------------------------------------------------------------- broadcasting
	private stamp(events: GameEvent[]): StampedEvent[] {
		const ts = this.now();
		return events.map((e) => {
			if (!(e.type in EVENT_AUDIENCE)) throw new Error(`Unclassified event ${e.type}`);
			const s = { ...e, eid: ++this.eid, turn: this.state.turnNumber, ts } as StampedEvent;
			this.log.push(s);
			return s;
		});
	}

	/** Stamp + log events, then send each recipient its filtered events and fresh view. */
	private publish(events: GameEvent[]) {
		const stamped = this.stamp(events);
		if (this.state.phase === 'battle') {
			this.observerSnapshots.push({ turn: this.state.turnNumber, view: this.viewFor({ kind: 'observer' })! });
			const keepFrom = this.state.turnNumber - this.cfg.observerDelayTurns - 1;
			this.observerSnapshots = this.observerSnapshots.filter((s) => s.turn >= keepFrom);
		}
		const room = this.roomInfo(true);
		const serverNow = this.now();
		for (const s of [0, 1] as Slot[]) {
			const p = this.players[s];
			if (!p) continue;
			const r: Recipient = { kind: 'player', slot: s };
			p.onUpdate({ events: stamped.filter((e) => eventVisibleTo(e, r)), view: this.viewFor(r), room, serverNow });
		}
		const oview = this.observerView();
		for (const o of this.observers.values()) {
			o.send('update', { events: this.observerEvents(o, stamped), view: oview, room, serverNow } satisfies UpdatePayload);
		}
	}

	/** Full snapshot for a (re)connecting recipient, with the visible history marked as replay. */
	snapshotFor(r: Recipient, o?: ObserverSink): UpdatePayload {
		const room = this.roomInfo(true);
		if (r.kind === 'player') {
			return { events: this.log.filter((e) => eventVisibleTo(e, r)), view: this.viewFor(r), room, serverNow: this.now(), replay: true };
		}
		const events = o ? this.observerEvents(o, []) : [];
		return { events, view: this.observerView(), room, serverNow: this.now(), replay: true };
	}

	// ---------------------------------------------------------------- seats
	seatPlayer(slot: Slot, player: Player, token: string | null) {
		this.players[slot] = player;
		this.tokens[slot] = token;
		const events: GameEvent[] = [{ type: 'player_joined', slot, name: player.name, isBot: player.isBot }];
		if (this.players[0] && this.players[1]) {
			events.push({ type: 'phase_changed', phase: 'placement' });
			this.startPlacementTimer();
		}
		this.publish(events);
	}

	addObserver(o: ObserverSink) {
		this.observers.set(o.id, o);
		this.publish([{ type: 'observer_count', count: this.observers.size }]);
	}

	removeObserver(id: string) {
		if (this.observers.delete(id)) this.publish([{ type: 'observer_count', count: this.observers.size }]);
	}

	disconnect(slot: Slot) {
		const p = this.players[slot];
		if (!p || this.closed) return;
		p.connected = false;
		if (this.phase === 'lobby') return this.close();
		if (this.state.phase === 'game-over') {
			this.publish([{ type: 'player_left', slot, graceDeadline: this.now() }]);
			if (this.players.every((x) => !x || x.isBot || !x.connected)) this.close();
			return;
		}
		const graceDeadline = this.now() + this.cfg.disconnectGraceMs;
		this.clearGrace(slot);
		this.graceTimers[slot] = setTimeout(() => this.forfeit(slot, 'disconnect'), this.cfg.disconnectGraceMs);
		this.publish([{ type: 'player_left', slot, graceDeadline }]);
	}

	reconnect(slot: Slot) {
		const p = this.players[slot];
		if (!p) return;
		p.connected = true;
		this.clearGrace(slot);
		this.publish([{ type: 'player_rejoined', slot }]);
	}

	private clearGrace(slot: Slot) {
		const t = this.graceTimers[slot];
		if (t) clearTimeout(t);
		this.graceTimers[slot] = null;
	}

	leave(slot: Slot) {
		if (this.phase === 'lobby') return this.close();
		if (this.state.phase !== 'game-over') this.forfeit(slot, 'forfeit');
		this.disconnect(slot);
	}

	// ---------------------------------------------------------------- actions
	private applyEngine(action: EngineAction): ReturnType<typeof applyAction> {
		const res = applyAction(this.state, action, this.rng);
		if (res.ok) {
			this.state = res.state;
			const events: GameEvent[] = res.events.map((e): GameEvent => {
				if (e.type === 'player_ready') {
					const s = e.slot;
					this.commitments[s] = commitBoard(this.state.players[s].placements!, this.salts[s]);
					return { ...e, commitment: this.commitments[s] };
				}
				return e;
			});
			if (this.state.phase === 'game-over') events.push(this.fairnessEvent());
			events.push(...this.afterChange());
			this.publish(events);
		}
		return res;
	}

	private fairnessEvent(): GameEvent {
		const pl = (s: Slot) => this.state.players[s].placements ?? [];
		return {
			type: 'fairness_reveal',
			reveal: { placements: [pl(0), pl(1)], salts: [...this.salts], commitments: [...this.commitments] }
		};
	}

	/** Single entry point for player actions (humans AND bots). */
	submit(slot: Slot, action: SeatAction): { ok: true } | { ok: false; code: string; message: string } {
		if (this.closed) return { ok: false, code: 'not-in-game', message: 'Room closed' };
		if (!this.players[slot]) return { ok: false, code: 'forbidden', message: 'Not seated' };
		if (this.phase === 'lobby') return { ok: false, code: 'engine', message: 'Waiting for opponent' };
		if (!Number.isInteger(action.seq) || action.seq <= this.lastSeq[slot]) {
			return { ok: false, code: 'duplicate', message: 'Duplicate or stale sequence number' };
		}
		let engineAction: EngineAction;
		switch (action.type) {
			case 'ready':
				engineAction = { type: 'ready', slot, placements: action.placements };
				break;
			case 'fire':
				engineAction = { type: 'fire', slot, target: action.target };
				break;
			case 'ability':
				engineAction = { type: 'ability', slot, ability: action.ability, target: action.target };
				break;
			default:
				return { ok: false, code: 'bad-message', message: 'Unknown action' };
		}
		const res = this.applyEngine(engineAction);
		if (!res.ok) return { ok: false, code: res.error.code, message: res.error.message };
		this.lastSeq[slot] = action.seq;
		if (action.type !== 'ready') this.consecutiveTimeouts[slot] = 0;
		return { ok: true };
	}

	lastSeqOf(slot: Slot) {
		return this.lastSeq[slot];
	}

	/** Server-side random deploy (server RNG). Not binding until submitted with `ready`. */
	randomDeploy(): ReturnType<typeof randomLayout> {
		return randomLayout(this.rng, this.state.config.gridSize);
	}

	emote(slot: Slot, emote: EmoteId) {
		const now = this.now();
		if (now - this.lastEmote[slot] < this.cfg.emoteCooldownMs) return false;
		this.lastEmote[slot] = now;
		this.publish([{ type: 'emote', slot, emote }]);
		return true;
	}

	requestRematch(slot: Slot) {
		if (this.state.phase !== 'game-over' || this.rematch.has(slot)) return;
		const other = this.players[otherSlot(slot)];
		if (!other || (!other.isBot && !other.connected)) return;
		this.rematch.add(slot);
		if (this.rematch.size < 2) return this.publish([{ type: 'rematch_requested', slot }]);
		this.rematch.clear();
		this.state = createInitialState(this.state.config);
		this.salts = [newSalt(), newSalt()];
		this.commitments = ['', ''];
		this.consecutiveTimeouts = [0, 0];
		this.observerSnapshots = [];
		this.finishedAt = null;
		this.startPlacementTimer();
		this.publish([{ type: 'rematch_requested', slot }, { type: 'rematch_started' }, { type: 'phase_changed', phase: 'placement' }]);
	}

	forfeit(slot: Slot, reason: GameOverReason) {
		if (this.state.phase === 'game-over' || this.phase === 'lobby') return;
		this.applyEngine({ type: 'forfeit', slot, reason });
	}

	// ---------------------------------------------------------------- timers
	private clearTurnTimer() {
		if (this.turnTimer) clearTimeout(this.turnTimer);
		this.turnTimer = null;
		this.deadline = null;
		this.timerTurnKey = '';
	}

	private startPlacementTimer() {
		this.clearTurnTimer();
		this.deadline = this.now() + this.cfg.placementMs;
		this.timerTurnKey = 'placement';
		this.turnTimer = setTimeout(() => this.onPlacementTimeout(), this.cfg.placementMs);
	}

	private onPlacementTimeout() {
		this.turnTimer = null;
		// Idle players get a server-generated random deploy so the game can't be stalled forever.
		for (const s of [0, 1] as Slot[]) {
			if (this.state.phase !== 'placement') break;
			if (!this.state.players[s].ready) this.applyEngine({ type: 'ready', slot: s, placements: this.randomDeploy() });
		}
	}

	/** Called after every successful engine change: (re)arms the turn timer. */
	private afterChange(): GameEvent[] {
		const s = this.state;
		if (s.phase === 'game-over') {
			this.clearTurnTimer();
			this.clearGrace(0);
			this.clearGrace(1);
			this.finishedAt = this.now();
			return [];
		}
		if (s.phase !== 'battle') return [];
		const key = `${s.turnNumber}`;
		if (key === this.timerTurnKey) return [];
		this.clearTurnTimer();
		this.timerTurnKey = key;
		this.deadline = this.now() + this.cfg.turnMs;
		const slot = s.turn;
		this.turnTimer = setTimeout(() => this.onTurnTimeout(slot), this.cfg.turnMs);
		return [{ type: 'timer', slot, deadline: this.deadline, durationMs: this.cfg.turnMs }];
	}

	private onTurnTimeout(slot: Slot) {
		this.turnTimer = null;
		this.timerTurnKey = '';
		if (this.state.phase !== 'battle' || this.state.turn !== slot) return;
		this.consecutiveTimeouts[slot]++;
		if (this.consecutiveTimeouts[slot] >= this.cfg.maxConsecutiveTimeouts) return this.forfeit(slot, 'idle');
		this.applyEngine({ type: 'timeout', slot });
	}

	// ---------------------------------------------------------------- lifecycle
	close() {
		if (this.closed) return;
		this.closed = true;
		this.clearTurnTimer();
		this.clearGrace(0);
		this.clearGrace(1);
		for (const p of this.players) p?.dispose?.();
		this.onClosed?.(this);
	}
}
