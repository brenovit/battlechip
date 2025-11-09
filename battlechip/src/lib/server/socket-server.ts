import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { GameRoom, GameState, PlayerState, Coordinate, ResourceType, Orientation } from '$lib/types/game';
import { createEmptyGrid, placeResource, allResourcesPlaced } from '$lib/utils/grid';
import { GameEngine } from './game-engine';

export class SocketServer {
	private io: SocketIOServer;
	private gameRooms: Map<string, GameRoom> = new Map();
	private gameEngine: GameEngine;

	constructor(server: HTTPServer) {
		this.io = new SocketIOServer(server, {
			cors: {
				origin: '*',
				methods: ['GET', 'POST']
			}
		});
		this.gameEngine = new GameEngine();
		this.setupSocketHandlers();
	}

	private setupSocketHandlers(): void {
		this.io.on('connection', (socket) => {
			console.log(`[CONNECTION] Client connected: ${socket.id}`);

			socket.on('create-game', (playerName: string, callback: (gameId: string, playerId: string) => void) => {
				const gameId = this.generateGameId();
				const playerId = socket.id;

				const player1: PlayerState = {
					id: playerId,
					name: playerName,
					grid: createEmptyGrid(),
					score: 0,
					abilities: {
						pingSweepAvailable: false,
						adminAccessActive: false,
						ddosEffectActive: false
					},
					destroyedResources: new Set(),
					isReady: false
				};

				const gameState: GameState = {
					id: gameId,
					phase: 'lobby',
					players: [player1, null as any],
					currentTurn: 0,
					createdAt: new Date()
				};

				const gameRoom: GameRoom = {
					gameState,
					playerSockets: new Map([[playerId, socket.id]])
				};

				this.gameRooms.set(gameId, gameRoom);
				socket.join(gameId);

				console.log(`[GAME CREATED] Game ${gameId} by ${playerName}`);
				callback(gameId, playerId);
			});

			socket.on('join-game', (gameId: string, playerName: string, callback) => {
				const gameRoom = this.gameRooms.get(gameId);

				if (!gameRoom) {
					callback(false, undefined, 'Game not found');
					return;
				}

				if (gameRoom.gameState.players[1]) {
					callback(false, undefined, 'Game is full');
					return;
				}

				const playerId = socket.id;
				const player2: PlayerState = {
					id: playerId,
					name: playerName,
					grid: createEmptyGrid(),
					score: 0,
					abilities: {
						pingSweepAvailable: false,
						adminAccessActive: false,
						ddosEffectActive: false
					},
					destroyedResources: new Set(),
					isReady: false
				};

				gameRoom.gameState.players[1] = player2;
				gameRoom.playerSockets.set(playerId, socket.id);
				socket.join(gameId);

				gameRoom.gameState.phase = 'placement';

				this.io.to(gameId).emit('game-update', {
					phase: 'placement'
				});

				const player1Socket = gameRoom.playerSockets.get(gameRoom.gameState.players[0].id);
				if (player1Socket) {
					this.io.to(player1Socket).emit('opponent-joined', playerName);
				}

				console.log(`[PLAYER JOINED] ${playerName} joined game ${gameId}`);
				callback(true, playerId);
			});

			socket.on('place-resources', (gameId: string, playerId: string, resourcePlacements: Array<{ type: ResourceType; start: Coordinate; orientation: Orientation }>) => {
				const gameRoom = this.gameRooms.get(gameId);
				if (!gameRoom) return;

				const player = gameRoom.gameState.players.find(p => p?.id === playerId);
				if (!player) return;

				for (const placement of resourcePlacements) {
					placeResource(player.grid, placement.type, placement.start, placement.orientation);
				}

				console.log(`[RESOURCES PLACED] Player ${player.name} placed resources`);
			});

			socket.on('player-ready', (gameId: string, playerId: string) => {
				const gameRoom = this.gameRooms.get(gameId);
				if (!gameRoom) return;

				const player = gameRoom.gameState.players.find(p => p?.id === playerId);
				if (!player) return;

				if (!allResourcesPlaced(player.grid)) {
					socket.emit('error', 'All resources must be placed');
					return;
				}

				player.isReady = true;

				const otherPlayerIndex = gameRoom.gameState.players[0].id === playerId ? 1 : 0;
				const otherPlayerSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[otherPlayerIndex].id);
				if (otherPlayerSocket) {
					this.io.to(otherPlayerSocket).emit('opponent-ready');
				}

				if (gameRoom.gameState.players[0].isReady && gameRoom.gameState.players[1].isReady) {
					gameRoom.gameState.phase = 'battle';
					this.io.to(gameId).emit('battle-started');

					const currentPlayerSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[gameRoom.gameState.currentTurn].id);
					if (currentPlayerSocket) {
						this.io.to(currentPlayerSocket).emit('your-turn');
					}

					console.log(`[BATTLE STARTED] Game ${gameId}`);
				}
			});

			socket.on('attack', (gameId: string, playerId: string, coordinate: Coordinate, callback) => {
				const gameRoom = this.gameRooms.get(gameId);
				if (!gameRoom) return;

				const attackerIndex = gameRoom.gameState.players.findIndex(p => p?.id === playerId);
				if (attackerIndex === -1 || attackerIndex !== gameRoom.gameState.currentTurn) {
					callback({
						coordinate,
						status: 'miss',
						points: 0,
						message: '[ERROR] - Not your turn'
					});
					return;
				}

				const result = this.gameEngine.processAttack(gameRoom.gameState, attackerIndex, coordinate);
				callback(result);

				const defenderIndex = attackerIndex === 0 ? 1 : 0;
				const defenderSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[defenderIndex].id);
				if (defenderSocket) {
					this.io.to(defenderSocket).emit('opponent-attacked', coordinate, result.status !== 'miss');
				}

				if (gameRoom.gameState.phase === 'game-over') {
					const finalScores: [number, number] = [
						gameRoom.gameState.players[0].score,
						gameRoom.gameState.players[1].score
					];
					const winner = finalScores[0] > finalScores[1] ? 0 : 1;
					gameRoom.gameState.winner = winner;

					this.io.to(gameId).emit('game-over', winner, finalScores);
					console.log(`[GAME OVER] Game ${gameId} - Winner: Player ${winner + 1}`);
				} else {
					this.gameEngine.switchTurn(gameRoom.gameState);
					const nextPlayerSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[gameRoom.gameState.currentTurn].id);
					if (nextPlayerSocket) {
						this.io.to(nextPlayerSocket).emit('your-turn');
					}
				}
			});

			socket.on('use-ping-sweep', (gameId: string, playerId: string, coordinate: Coordinate, callback) => {
				const gameRoom = this.gameRooms.get(gameId);
				if (!gameRoom) return;

				const attackerIndex = gameRoom.gameState.players.findIndex(p => p?.id === playerId);
				if (attackerIndex === -1) return;

				const result = this.gameEngine.processPingSweep(gameRoom.gameState, attackerIndex, coordinate);
				if (result) {
					callback(result);
					
					this.gameEngine.switchTurn(gameRoom.gameState);
					const nextPlayerSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[gameRoom.gameState.currentTurn].id);
					if (nextPlayerSocket) {
						this.io.to(nextPlayerSocket).emit('your-turn');
					}
				} else {
					socket.emit('error', 'Ping Sweep not available');
				}
			});

			socket.on('disconnect', () => {
				console.log(`[DISCONNECT] Client disconnected: ${socket.id}`);
				for (const [gameId, gameRoom] of this.gameRooms.entries()) {
					for (const [playerId, socketId] of gameRoom.playerSockets.entries()) {
						if (socketId === socket.id) {
							this.io.to(gameId).emit('player-disconnected', playerId);
							this.gameRooms.delete(gameId);
							break;
						}
					}
				}
			});
		});
	}

	private generateGameId(): string {
		return Math.random().toString(36).substring(2, 8).toUpperCase();
	}

	getIO(): SocketIOServer {
		return this.io;
	}
}
