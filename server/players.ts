/**
 * Player abstraction. The room talks to every seat through this interface, and every action
 * (human or bot) enters the room through the SAME `RoomPort.submit` path, i.e. the same
 * validation (schema-shaped action, seq/idempotency, turn/phase checks in the engine).
 *
 * - HumanPlayer: actions arrive from the socket; `send` forwards updates to the socket.
 * - BotPlayer:   autonomous; implements `deploy()` / `chooseMove(visibleState)` and only ever
 *                sees the VisibleState of its own seat.
 */
import type { Placement, Slot } from '../shared/types.js';
import type { Rng } from '../shared/rng.js';
import type { VisibleState } from '../shared/engine/view.js';
import type { RoomInfo, UpdatePayload } from '../shared/protocol.js';
import type { Socket } from 'socket.io';
import { getStrategy, type BotMove, type BotStrategy } from './bot/strategies.js';
import type { Difficulty } from '../shared/types.js';

export type SeatAction =
	| { type: 'ready'; seq: number; placements: Placement[] }
	| { type: 'fire'; seq: number; target: { row: number; col: number } }
	| { type: 'ability'; seq: number; ability: string; target?: { row: number; col: number } };

/** What a player may do to the room. */
export interface RoomPort {
	submit(slot: Slot, action: SeatAction): { ok: true } | { ok: false; code: string; message: string };
	requestRematch(slot: Slot): void;
}

export interface Player {
	readonly slot: Slot;
	readonly name: string;
	readonly isBot: boolean;
	connected: boolean;
	/** Deliver a server->client message. */
	send(event: string, payload: unknown): void;
	/** Called after every room update with this seat's visible state. */
	onUpdate(update: UpdatePayload): void;
	/** Autonomous players only. */
	deploy?(): Placement[];
	chooseMove?(view: VisibleState): BotMove;
	dispose?(): void;
}

export class HumanPlayer implements Player {
	readonly isBot = false;
	connected = true;
	constructor(
		readonly slot: Slot,
		readonly name: string,
		public socket: Socket | null
	) {}
	send(event: string, payload: unknown) {
		if (this.connected && this.socket) this.socket.emit(event, payload);
	}
	onUpdate(update: UpdatePayload) {
		this.send('update', update);
	}
	attach(socket: Socket) {
		this.socket = socket;
		this.connected = true;
	}
	detach() {
		this.socket = null;
		this.connected = false;
	}
}

export interface BotTiming {
	minDelayMs: number;
	maxDelayMs: number;
}

export class BotPlayer implements Player {
	readonly isBot = true;
	connected = true;
	private seq = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private strategy: BotStrategy;
	private lastHandledTurn = -1;
	private deployed = false;

	constructor(
		readonly slot: Slot,
		readonly name: string,
		difficulty: Difficulty,
		private room: RoomPort,
		private rng: Rng,
		private timing: BotTiming,
		private gridSize = 10
	) {
		this.strategy = getStrategy(difficulty);
	}

	send() {}

	deploy(): Placement[] {
		return this.strategy.deploy(this.rng, this.gridSize);
	}

	chooseMove(view: VisibleState): BotMove {
		return this.strategy.chooseMove(view, this.rng);
	}

	private later(fn: () => void) {
		if (this.timer) return;
		const { minDelayMs, maxDelayMs } = this.timing;
		const delay = minDelayMs + this.rng.int(Math.max(1, maxDelayMs - minDelayMs + 1));
		this.timer = setTimeout(() => {
			this.timer = null;
			fn();
		}, delay);
	}

	onUpdate({ view, room }: UpdatePayload) {
		this.maybeRematch(room);
		if (!view || view.viewer.kind !== 'player') return;
		if (view.phase === 'placement') {
			this.lastHandledTurn = -1;
			if (!view.own?.placements && !this.deployed) {
				this.deployed = true;
				this.later(() => this.room.submit(this.slot, { type: 'ready', seq: ++this.seq, placements: this.deploy() }));
			}
			return;
		}
		this.deployed = false;
		if (view.phase === 'battle' && view.turn === this.slot) {
			// Key on turnNumber + extra shots so extra shots in the same turn get handled too.
			const key = view.turnNumber * 100 + (view.own?.extraShots ?? 0) + view.boards[0].stats.shots + view.boards[1].stats.shots * 1000;
			if (key === this.lastHandledTurn) return;
			this.lastHandledTurn = key;
			this.later(() => {
				const move = this.chooseMove(view);
				const res = this.room.submit(this.slot, { ...move, seq: ++this.seq } as SeatAction);
				if (!res.ok) this.lastHandledTurn = -1;
			});
		}
	}

	private maybeRematch(room: RoomInfo) {
		if (room.phase === 'game-over' && room.rematchRequests.length > 0 && !room.rematchRequests.includes(this.slot)) {
			this.room.requestRematch(this.slot);
		}
	}

	dispose() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
	}
}
