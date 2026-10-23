/**
 * Socket connection store. One Socket.IO connection per tab; all client->server traffic goes
 * through `send()` as a single whitelisted `'msg'` event (see shared/protocol.ts).
 */
import { writable, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import type { ClientMessage } from '$shared/protocol';

export const connected = writable(false);

let socket: Socket | null = null;
const handlers: ((s: Socket) => void)[] = [];

/** Register listeners; applied to the socket when it is created. */
export function onSocket(register: (s: Socket) => void) {
	handlers.push(register);
	if (socket) register(socket);
}

export function connect(): Socket {
	if (socket) return socket;
	socket = io({ transports: ['websocket', 'polling'] });
	socket.on('connect', () => connected.set(true));
	socket.on('disconnect', () => connected.set(false));
	for (const h of handlers) h(socket);
	return socket;
}

export function send(msg: ClientMessage) {
	(socket ?? connect()).emit('msg', msg);
}

export function isConnected() {
	return get(connected);
}
