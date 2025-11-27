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
	winner: number | null;
	opponentWantsRematch: boolean;
	requestedRematch: boolean;
	opponentDisconnected: boolean;
	isObserver: boolean;
	observerId: string | null;
	player1State: PlayerState | null;
	player2State: PlayerState | null;
	currentTurn: number;
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
		socket: null,
		winner: null,
		opponentWantsRematch: false,
		requestedRematch: false,
		opponentDisconnected: false,
		isObserver: false,
		observerId: null,
		player1State: null,
		player2State: null,
		currentTurn: 0
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
				console.log('[GAME] game-update event received:', data);
				update(state => {
					const newState = { ...state, ...data };
					console.log('[GAME] State after game-update - phase:', newState.phase);
					return newState;
				});
			});

			socket.on('opponent-joined', (opponentName: string) => {
				console.log('[GAME] opponent-joined event received:', opponentName);
				update(state => {
					console.log('[GAME] Updating state with opponent and transitioning to placement');
					return { ...state, opponentName, phase: 'placement' };
				});
			});

			socket.on('opponent-ready', () => {
				console.log('[GAME] Opponent is ready');
			});

			socket.on('battle-started', () => {
				console.log('[GAME] ========================================');
				console.log('[GAME] BATTLE-STARTED EVENT RECEIVED FROM SERVER');
				console.log('[GAME] Updating phase from placement to battle');
				console.log('[GAME] ========================================');
				update(state => {
					console.log('[GAME] Current phase:', state.phase, '-> New phase: battle');
					return { ...state, phase: 'battle' };
				});
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
				update(state => ({ ...state, phase: 'game-over', winner }));
			});

			socket.on('opponent-wants-rematch', () => {
				console.log('[GAME] Opponent wants a rematch!');
				update(state => ({ ...state, opponentWantsRematch: true }));
			});

			socket.on('rematch-accepted', () => {
				console.log('[GAME] Rematch accepted! Restarting game...');
				update(state => ({ 
					...state, 
					phase: 'placement',
					winner: null,
					myState: null,
					opponentState: null,
					isMyTurn: false,
					opponentWantsRematch: false,
					requestedRematch: false
				}));
			});

			socket.on('player-disconnected', (playerId: string) => {
				console.log('[GAME] Player disconnected:', playerId);
				update(state => ({ ...state, opponentDisconnected: true }));
			});

			socket.on('error', (message: string) => {
				console.error('[ERROR]', message);
				alert(message);
			});

			socket.on('observer-state', (observerState: any) => {
				console.log('[OBSERVER] Received observer state:', observerState);
				update(state => ({
					...state,
					phase: observerState.phase,
					currentTurn: observerState.currentTurn,
					player1State: observerState.player1,
					player2State: observerState.player2
				}));
			});

			socket.on('observer-battle-started', (data: any) => {
				console.log('[OBSERVER] Battle started');
				update(state => ({
					...state,
					phase: 'battle',
					player1State: { ...state.player1State, grid: data.player1Grid, name: data.player1Name } as PlayerState,
					player2State: { ...state.player2State, grid: data.player2Grid, name: data.player2Name } as PlayerState,
					currentTurn: data.currentTurn
				}));
			});

			socket.on('observer-attack-update', (data: any) => {
				console.log('[OBSERVER] Attack update:', data);
				update(state => ({
					...state,
					player1State: state.player1State ? { ...state.player1State, grid: data.player1Grid, score: data.player1Score } : null,
					player2State: state.player2State ? { ...state.player2State, grid: data.player2Grid, score: data.player2Score } : null,
					currentTurn: data.currentTurn
				}));
			});
		},
		createGame: (playerName: string) => {
			if (!socket) return;

			console.log('[GAME] Emitting create-game event with name:', playerName);
			socket.emit('create-game', playerName, (gameId: string, playerId: string) => {
				console.log('[GAME] create-game callback received - gameId:', gameId, 'playerId:', playerId);
				update(state => {
					console.log('[GAME] Setting initial state: phase = lobby, gameId =', gameId);
					return {
						...state,
						gameId,
						playerId,
						playerIndex: 0,
						phase: 'lobby'
					};
				});
			});
		},
		joinGame: (gameId: string, playerName: string) => {
			console.log('[GAME] joinGame method called - socket exists:', !!socket, 'socket connected:', socket?.connected);
			if (!socket) {
				console.error('[GAME] No socket available!');
				return;
			}

			console.log('[GAME] Emitting join-game event - gameId:', gameId, 'name:', playerName);
			socket.emit('join-game', gameId, playerName, (success: boolean, playerId?: string, error?: string) => {
				console.log('[GAME] join-game callback - success:', success, 'playerId:', playerId, 'error:', error);
				if (success && playerId) {
					console.log('[GAME] Successfully joined game:', gameId);
					update(state => {
						console.log('[GAME] Setting state: phase = placement, gameId =', gameId);
						return {
							...state,
							gameId,
							playerId,
							playerIndex: 1,
							phase: 'placement'
						};
					});
				} else {
					console.error('[GAME] Failed to join game:', error);
					alert(error || 'Failed to join game');
				}
			});
		},
		joinAsObserver: (gameId: string, observerName: string) => {
			console.log('[OBSERVER] joinAsObserver method called - gameId:', gameId, 'name:', observerName);
			if (!socket) {
				console.error('[OBSERVER] No socket available!');
				return;
			}

			socket.emit('join-as-observer', gameId, observerName, (success: boolean, observerId?: string, error?: string) => {
				console.log('[OBSERVER] join-as-observer callback - success:', success, 'observerId:', observerId, 'error:', error);
				if (success && observerId) {
					console.log('[OBSERVER] Successfully joined as observer:', gameId);
					update(state => ({
						...state,
						gameId,
						observerId,
						isObserver: true
						// Don't set phase here - let observer-state event handle it
					}));
				} else {
					console.error('[OBSERVER] Failed to join as observer:', error);
					alert(error || 'Failed to join as observer');
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
		requestRematch: () => {
			if (!socket) return;

			const state = { gameId: '', playerId: '' };
			const unsubscribe = subscribe(s => {
				state.gameId = s.gameId || '';
				state.playerId = s.playerId || '';
			});
			unsubscribe();

			console.log('[GAME] Requesting rematch...');
			socket.emit('request-rematch', state.gameId, state.playerId);
			update(s => ({ ...s, requestedRematch: true }));
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
				socket: null,
				winner: null,
				opponentWantsRematch: false,
				requestedRematch: false,
				opponentDisconnected: false,
				isObserver: false,
				observerId: null,
				player1State: null,
				player2State: null,
				currentTurn: 0
			});
		}
	};
}

export const gameStore = createGameStore();
