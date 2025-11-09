import { writable, derived } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import type { GamePhase, PlayerState, Coordinate, AttackResult } from '$lib/types/game';

interface GameStore {
	gameId: string | null;
	playerId: string | null;
	playerIndex: number | null;
	phase: GamePhase;
	myState: PlayerState | null;
	opponentState: PlayerState | null;
	isMyTurn: boolean;
	opponentName: string | null;
	socket: Socket | null;
}

function createGameStore() {
	const { subscribe, set, update } = writable<GameStore>({
		gameId: null,
		playerId: null,
		playerIndex: null,
		phase: 'lobby',
		myState: null,
		opponentState: null,
		isMyTurn: false,
		opponentName: null,
		socket: null
	});

	let socket: Socket | null = null;

	return {
		subscribe,
		connect: () => {
			if (socket) return;

			socket = io({
				transports: ['websocket', 'polling']
			});

			socket.on('connect', () => {
				console.log('[SOCKET] Connected to server');
				update(state => ({ ...state, socket }));
			});

			socket.on('disconnect', () => {
				console.log('[SOCKET] Disconnected from server');
			});

			socket.on('game-update', (data: Partial<GameStore>) => {
				update(state => ({ ...state, ...data }));
			});

			socket.on('opponent-joined', (opponentName: string) => {
				console.log('[GAME] Opponent joined:', opponentName);
				update(state => ({ ...state, opponentName, phase: 'placement' }));
			});

			socket.on('opponent-ready', () => {
				console.log('[GAME] Opponent is ready');
			});

			socket.on('battle-started', () => {
				console.log('[GAME] Battle started!');
				update(state => ({ ...state, phase: 'battle' }));
			});

			socket.on('your-turn', () => {
				console.log('[GAME] Your turn!');
				update(state => ({ ...state, isMyTurn: true }));
			});

			socket.on('opponent-attacked', (coordinate: Coordinate, wasHit: boolean) => {
				console.log('[GAME] Opponent attacked:', coordinate, wasHit ? 'HIT' : 'MISS');
				update(state => ({ ...state, isMyTurn: false }));
			});

			socket.on('game-over', (winner: number, finalScores: [number, number]) => {
				console.log('[GAME] Game over! Winner:', winner, 'Scores:', finalScores);
				update(state => ({ ...state, phase: 'game-over' }));
			});

			socket.on('error', (message: string) => {
				console.error('[ERROR]', message);
				alert(message);
			});
		},
		createGame: (playerName: string) => {
			if (!socket) return;

			socket.emit('create-game', playerName, (gameId: string, playerId: string) => {
				console.log('[GAME] Created game:', gameId);
				update(state => ({
					...state,
					gameId,
					playerId,
					playerIndex: 0,
					phase: 'lobby'
				}));
			});
		},
		joinGame: (gameId: string, playerName: string) => {
			if (!socket) return;

			socket.emit('join-game', gameId, playerName, (success: boolean, playerId?: string, error?: string) => {
				if (success && playerId) {
					console.log('[GAME] Joined game:', gameId);
					update(state => ({
						...state,
						gameId,
						playerId,
						playerIndex: 1,
						phase: 'placement'
					}));
				} else {
					alert(error || 'Failed to join game');
				}
			});
		},
		attack: (coordinate: Coordinate, callback: (result: AttackResult) => void) => {
			if (!socket) return;

			const state = { gameId: '', playerId: '' };
			const unsubscribe = subscribe(s => {
				state.gameId = s.gameId || '';
				state.playerId = s.playerId || '';
			});
			unsubscribe();

			socket.emit('attack', state.gameId, state.playerId, coordinate, (result: AttackResult) => {
				callback(result);
				update(s => ({ ...s, isMyTurn: false }));
			});
		},
		getSocket: () => socket,
		reset: () => {
			if (socket) {
				socket.disconnect();
				socket = null;
			}
			set({
				gameId: null,
				playerId: null,
				playerIndex: null,
				phase: 'lobby',
				myState: null,
				opponentState: null,
				isMyTurn: false,
				opponentName: null,
				socket: null
			});
		}
	};
}

export const gameStore = createGameStore();
