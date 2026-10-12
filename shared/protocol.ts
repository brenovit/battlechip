/**
 * Wire protocol (Socket.IO). Types only; runtime validation lives in server/schemas.ts (Zod).
 *
 * Client -> server: a single socket event `'msg'` carrying a ClientMessage envelope.
 *   Any other event name is rejected (whitelist).
 * Server -> client events:
 *   'session'      SessionInfo     (after create/join/observe/resume)
 *   'update'       UpdatePayload   (events + fresh visible state + room info)
 *   'random_layout'{ placements }  (answer to random_deploy)
 *   'ack'          { seq, duplicate? }
 *   'server_error' ServerError
 */
import type { Coord, Difficulty, EmoteId, Phase, Placement, Slot } from './types.js';
import type { StampedEvent } from './events.js';
import type { VisibleState } from './engine/view.js';

export type ClientMessage =
	| { type: 'create'; name: string; vsAi?: boolean; difficulty?: Difficulty }
	| { type: 'join'; code: string; name: string }
	| { type: 'observe'; code: string }
	| { type: 'resume'; token: string }
	| { type: 'random_deploy' }
	| { type: 'ready'; seq: number; placements: Placement[] }
	| { type: 'fire'; seq: number; target: Coord }
	| { type: 'ability'; seq: number; ability: string; target?: Coord }
	| { type: 'emote'; emote: EmoteId }
	| { type: 'rematch' }
	| { type: 'leave' };

export type ClientMessageType = ClientMessage['type'];

export type Role = 'player' | 'observer';

export interface SessionInfo {
	code: string;
	role: Role;
	slot: Slot | null;
	/** Secret token (players only); store in sessionStorage and send with `resume`. */
	token: string | null;
	/** Last accepted action sequence number (continue from lastSeq + 1). */
	lastSeq: number;
}

export interface RoomPlayerInfo {
	slot: Slot;
	name: string;
	isBot: boolean;
	connected: boolean;
	ready: boolean;
}

export interface RoomInfo {
	code: string;
	phase: Phase;
	players: [RoomPlayerInfo | null, RoomPlayerInfo | null];
	observerCount: number;
	/** Epoch ms when the current turn times out (null when no timer is running). */
	deadline: number | null;
	turnDurationMs: number;
	rematchRequests: Slot[];
	vsAi: boolean;
	difficulty: Difficulty | null;
	/** Observer delay in turns (observers see the board this many turns late). */
	observerDelayTurns: number;
	/** Present at game end: the full move log for replay. */
	moveLog?: StampedEvent[];
}

export interface UpdatePayload {
	events: StampedEvent[];
	/** null while in the lobby (no engine view yet). */
	view: VisibleState | null;
	room: RoomInfo;
	/** Server clock at send time (for deadline skew correction). */
	serverNow: number;
	/** True when `events` is history (e.g. after resume): render, but do not animate. */
	replay?: boolean;
}

export type ServerErrorCode =
	| 'bad-message'
	| 'rate-limited'
	| 'not-found'
	| 'room-full'
	| 'not-in-game'
	| 'forbidden'
	| 'invalid-session'
	| 'engine'
	| 'internal';

export interface ServerError {
	code: ServerErrorCode;
	message: string;
	seq?: number;
	/** Engine error code when code === 'engine'. */
	engineCode?: string;
}
