/**
 * RoomManager: rooms, secret session tokens, and the per-socket message dispatcher.
 * Every inbound message: size cap (maxHttpBufferSize) -> event whitelist -> rate limit ->
 * Zod schema -> role/session checks -> room.submit (engine validation, seq idempotency).
 */
import type { Server, Socket } from 'socket.io';
import type { Slot } from '../shared/types.js';
import type { ClientMessage, ServerError, SessionInfo } from '../shared/protocol.js';
import { CONFIG } from './config.js';
import { GameRoom, type ObserverSink } from './room.js';
import { BotPlayer, HumanPlayer } from './players.js';
import { parseClientMessage } from './schemas.js';
import { TokenBucket, WindowLimiter, cryptoRng, generateGameCode, generateToken, sanitizeName } from './security.js';
import type { Rng } from '../shared/rng.js';

interface SocketCtx {
	room: GameRoom | null;
	slot: Slot | null;
	observer: ObserverSink | null;
	bucket: TokenBucket;
	violations: number;
}

export class RoomManager {
	rooms = new Map<string, GameRoom>();
	/** token -> seat. Tokens are secret, random, server-issued; roles are never taken from the client. */
	sessions = new Map<string, { code: string; slot: Slot }>();
	private joinLimiter = new WindowLimiter(CONFIG.joinPerMinute, 60_000);
	private sweeper: ReturnType<typeof setInterval>;

	constructor(
		private rng: Rng = cryptoRng(),
		private cfg: typeof CONFIG = CONFIG
	) {
		this.sweeper = setInterval(() => this.sweep(), 60_000);
		this.sweeper.unref?.();
	}

	createRoom(opts: { vsAi?: boolean; difficulty?: GameRoom['difficulty'] } = {}): GameRoom {
		let code = generateGameCode();
		while (this.rooms.has(code)) code = generateGameCode();
		const room = new GameRoom({
			code,
			rng: this.rng,
			vsAi: opts.vsAi,
			difficulty: opts.difficulty,
			config: this.cfg,
			onClosed: (r) => this.removeRoom(r)
		});
		this.rooms.set(code, room);
		return room;
	}

	private removeRoom(r: GameRoom) {
		this.rooms.delete(r.code);
		for (const t of r.tokens) if (t) this.sessions.delete(t);
	}

	private sweep() {
		const now = Date.now();
		for (const r of this.rooms.values()) {
			if (r.phase === 'lobby' && now - r.createdAt > this.cfg.lobbyTtlMs) r.close();
			else if (r.finishedAt && now - r.finishedAt > this.cfg.finishedTtlMs) r.close();
		}
	}

	dispose() {
		clearInterval(this.sweeper);
		for (const r of [...this.rooms.values()]) r.close();
	}

	// ------------------------------------------------------------------ socket wiring
	attach(io: Server) {
		io.on('connection', (socket) => this.onConnection(socket));
	}

	onConnection(socket: Socket) {
		const ctx: SocketCtx = { room: null, slot: null, observer: null, bucket: new TokenBucket(this.cfg.msgBurst, this.cfg.msgPerSec), violations: 0 };
		const ip = (socket.handshake.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || socket.handshake.address;

		const err = (e: ServerError) => socket.emit('server_error', e);
		const violation = (e: ServerError) => {
			err(e);
			if (++ctx.violations > 50) socket.disconnect(true);
		};

		socket.onAny((event: string) => {
			if (event !== 'msg') violation({ code: 'bad-message', message: 'Unknown event' });
		});

		socket.on('msg', (raw: unknown) => {
			if (!ctx.bucket.take()) return violation({ code: 'rate-limited', message: 'Slow down' });
			const parsed = parseClientMessage(raw);
			if (!parsed.ok) return violation({ code: 'bad-message', message: parsed.error });
			try {
				this.handle(socket, ctx, parsed.msg, ip, err);
			} catch (e) {
				console.error('[SERVER] handler error', e);
				err({ code: 'internal', message: 'Internal error' });
			}
		});

		socket.on('disconnect', () => {
			if (ctx.room && ctx.slot !== null) {
				const p = ctx.room.players[ctx.slot];
				if (p instanceof HumanPlayer && p.socket === socket) {
					p.detach();
					ctx.room.disconnect(ctx.slot);
				}
			}
			if (ctx.room && ctx.observer) ctx.room.removeObserver(ctx.observer.id);
		});
	}

	private seatHuman(socket: Socket, ctx: SocketCtx, room: GameRoom, slot: Slot, name: string) {
		const token = generateToken();
		this.sessions.set(token, { code: room.code, slot });
		ctx.room = room;
		ctx.slot = slot;
		socket.emit('session', { code: room.code, role: 'player', slot, token, lastSeq: 0 } satisfies SessionInfo);
		room.seatPlayer(slot, new HumanPlayer(slot, name, socket), token);
	}

	private handle(socket: Socket, ctx: SocketCtx, msg: ClientMessage, ip: string, err: (e: ServerError) => void) {
		const inGame = ctx.room !== null && !ctx.room.closed;
		switch (msg.type) {
			case 'create': {
				if (inGame) return err({ code: 'forbidden', message: 'Already in a game' });
				const room = this.createRoom({ vsAi: msg.vsAi, difficulty: msg.difficulty });
				this.seatHuman(socket, ctx, room, 0, sanitizeName(msg.name));
				if (msg.vsAi) {
					const bot = new BotPlayer(
						1,
						`BOT-${(room.difficulty ?? 'easy').toUpperCase()}`,
						room.difficulty ?? 'easy',
						room,
						this.rng,
						{ minDelayMs: this.cfg.botMinDelayMs, maxDelayMs: this.cfg.botMaxDelayMs }
					);
					room.seatPlayer(1, bot, null);
				}
				return;
			}
			case 'join': {
				if (inGame) return err({ code: 'forbidden', message: 'Already in a game' });
				if (!this.joinLimiter.allow(ip)) return err({ code: 'rate-limited', message: 'Too many join attempts' });
				const room = this.rooms.get(msg.code);
				if (!room || room.closed) return err({ code: 'not-found', message: 'Game not found' });
				if (room.players[1] || room.vsAi) return err({ code: 'room-full', message: 'Game is full' });
				return this.seatHuman(socket, ctx, room, 1, sanitizeName(msg.name));
			}
			case 'observe': {
				if (inGame) return err({ code: 'forbidden', message: 'Already in a game' });
				if (!this.joinLimiter.allow(ip)) return err({ code: 'rate-limited', message: 'Too many join attempts' });
				const room = this.rooms.get(msg.code);
				if (!room || room.closed) return err({ code: 'not-found', message: 'Game not found' });
				const sink: ObserverSink = { id: socket.id, cursor: 0, send: (e, p) => socket.emit(e, p) };
				ctx.room = room;
				ctx.observer = sink;
				socket.emit('session', { code: room.code, role: 'observer', slot: null, token: null, lastSeq: 0 } satisfies SessionInfo);
				socket.emit('update', room.snapshotFor({ kind: 'observer' }, sink));
				room.addObserver(sink);
				return;
			}
			case 'resume': {
				if (!this.joinLimiter.allow(ip)) return err({ code: 'rate-limited', message: 'Too many attempts' });
				const s = this.sessions.get(msg.token);
				const room = s && this.rooms.get(s.code);
				if (!s || !room || room.closed) return err({ code: 'invalid-session', message: 'Session expired' });
				const p = room.players[s.slot];
				if (!(p instanceof HumanPlayer)) return err({ code: 'invalid-session', message: 'Session expired' });
				p.socket?.disconnect(true); // a newer tab takes over the seat
				p.attach(socket);
				ctx.room = room;
				ctx.slot = s.slot;
				socket.emit('session', { code: room.code, role: 'player', slot: s.slot, token: msg.token, lastSeq: room.lastSeqOf(s.slot) } satisfies SessionInfo);
				socket.emit('update', room.snapshotFor({ kind: 'player', slot: s.slot }));
				room.reconnect(s.slot);
				return;
			}
		}

		// Seat-bound messages below: the sender must be a seated player (never an observer).
		if (!ctx.room || ctx.slot === null || ctx.room.closed) {
			return err({ code: ctx.observer ? 'forbidden' : 'not-in-game', message: 'Not a player in a game' });
		}
		const room = ctx.room;
		const slot = ctx.slot;
		switch (msg.type) {
			case 'random_deploy':
				if (room.state.phase !== 'placement' || room.state.players[slot].ready) return err({ code: 'forbidden', message: 'Not in placement' });
				socket.emit('random_layout', { placements: room.randomDeploy() });
				return;
			case 'ready':
			case 'fire':
			case 'ability': {
				const r = room.submit(slot, msg);
				if (r.ok) socket.emit('ack', { seq: msg.seq });
				else if (r.code === 'duplicate') socket.emit('ack', { seq: msg.seq, duplicate: true });
				else err({ code: 'engine', engineCode: r.code, message: r.message, seq: msg.seq });
				return;
			}
			case 'emote':
				room.emote(slot, msg.emote);
				return;
			case 'rematch':
				room.requestRematch(slot);
				return;
			case 'leave': {
				const token = room.tokens[slot];
				if (token) this.sessions.delete(token);
				const p = room.players[slot];
				room.leave(slot);
				if (p instanceof HumanPlayer) p.detach();
				ctx.room = null;
				ctx.slot = null;
				return;
			}
		}
	}
}
