/**
 * Game stores (client is display-only; the server is the source of truth).
 *
 *   session       SessionInfo | null      who am I (role/slot/code); token kept in sessionStorage
 *   room          RoomInfo | null         players, phase (incl. lobby), observers, deadline, rematch
 *   visibleState  VisibleState | null     my projection of the engine state
 *   events        event stream (subscribe via onGameEvent / eventLog)
 *   deadline      epoch ms (client clock, skew-corrected) when the current turn/placement ends
 *   randomLayout  last server-generated random deploy proposal
 *
 * Send helpers: createGame, joinGame, observeGame, resume, requestRandomDeploy, ready, fire,
 * useAbility, emote, requestRematch, leaveGame.
 */
import { derived, get, writable } from 'svelte/store';
import type { Socket } from 'socket.io-client';
import type { RoomInfo, ServerError, SessionInfo, UpdatePayload } from '$shared/protocol';
import type { StampedEvent } from '$shared/events';
import type { VisibleState } from '$shared/engine/view';
import type { Coord, Difficulty, EmoteId, Phase, Placement } from '$shared/types';
import { connect, onSocket, send } from './socket';
import { messageStore } from './message';

const TOKEN_KEY = 'battlechip.session';

export const session = writable<SessionInfo | null>(null);
export const room = writable<RoomInfo | null>(null);
export const visibleState = writable<VisibleState | null>(null);
export const randomLayout = writable<Placement[] | null>(null);
/** Rolling event log (most recent last), capped. Includes replayed history after a resume. */
export const eventLog = writable<StampedEvent[]>([]);
export const lastError = writable<ServerError | null>(null);
/** Server clock minus client clock (ms). */
let clockSkew = 0;

export const phase = derived([room], ([$room]) => ($room?.phase ?? 'lobby') as Phase);
export const isObserver = derived(session, ($s) => $s?.role === 'observer');
export const mySlot = derived(session, ($s) => $s?.slot ?? null);
export const isMyTurn = derived([visibleState, mySlot], ([$v, $slot]) => !!$v && $v.phase === 'battle' && $v.turn === $slot);
/** Deadline in CLIENT clock epoch ms. */
export const deadline = derived(room, ($r) => ($r?.deadline ? $r.deadline - clockSkew : null));

type EventListener = (e: StampedEvent, replay: boolean) => void;
const listeners = new Set<EventListener>();
/** Subscribe to the live event stream (for animations/sounds). Returns an unsubscribe fn. */
export function onGameEvent(fn: EventListener): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

let seq = 0;
const nextSeq = () => ++seq;

function applyUpdate(u: UpdatePayload) {
	clockSkew = u.serverNow - Date.now();
	if (u.replay) eventLog.set(u.events.slice(-500));
	else if (u.events.length) eventLog.update((l) => [...l, ...u.events].slice(-500));
	room.set(u.room);
	visibleState.set(u.view);
	if (u.room.phase !== 'placement') randomLayout.set(null);
	for (const e of u.events) for (const fn of listeners) fn(e, !!u.replay);
}

function register(s: Socket) {
	s.on('session', (info: SessionInfo) => {
		session.set(info);
		seq = Math.max(seq, info.lastSeq);
		if (info.token) sessionStorage.setItem(TOKEN_KEY, info.token);
	});
	s.on('update', applyUpdate);
	s.on('random_layout', (p: { placements: Placement[] }) => randomLayout.set(p.placements));
	s.on('server_error', (e: ServerError) => {
		lastError.set(e);
		if (e.code === 'invalid-session') {
			sessionStorage.removeItem(TOKEN_KEY);
			resetLocal();
			return;
		}
		messageStore.show(e.message, 'error');
	});
	// On (re)connect, resume the seat if we have a token.
	s.on('connect', () => {
		const token = sessionStorage.getItem(TOKEN_KEY);
		if (token) send({ type: 'resume', token });
	});
}
onSocket(register);

function resetLocal() {
	session.set(null);
	room.set(null);
	visibleState.set(null);
	eventLog.set([]);
	randomLayout.set(null);
}

export function initGame() {
	connect();
}

export const createGame = (name: string, opts: { vsAi?: boolean; difficulty?: Difficulty } = {}) =>
	send({ type: 'create', name, ...opts });
export const joinGame = (code: string, name: string) => send({ type: 'join', code: code.trim().toUpperCase(), name });
export const observeGame = (code: string) => send({ type: 'observe', code: code.trim().toUpperCase() });
export const requestRandomDeploy = () => send({ type: 'random_deploy' });
export const ready = (placements: Placement[]) => send({ type: 'ready', seq: nextSeq(), placements });
export const fire = (target: Coord) => send({ type: 'fire', seq: nextSeq(), target });
export const useAbility = (ability: string, target?: Coord) => send({ type: 'ability', seq: nextSeq(), ability, target });
export const emote = (e: EmoteId) => send({ type: 'emote', emote: e });
export const requestRematch = () => send({ type: 'rematch' });
export function leaveGame() {
	if (get(session)?.role === 'player') send({ type: 'leave' });
	sessionStorage.removeItem(TOKEN_KEY);
	resetLocal();
	// Observers just drop the socket.
	window.location.reload();
}
