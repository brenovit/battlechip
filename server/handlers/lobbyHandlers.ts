import { Socket, Server as SocketIOServer } from 'socket.io';
import { GameRoom, Player } from '../types.js';
import { createEmptyGrid } from '../utils/grid.js';
import { generateGameId } from '../game/gameLogic.js';

export function handleCreateGame(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (playerName: string, callback: (gameId: string, playerId: string) => void) => {
    const gameId = generateGameId();
    const playerId = socket.id;

    const player1: Player = {
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

    const gameRoom: GameRoom = {
      gameState: {
        id: gameId,
        phase: 'lobby',
        players: [player1, null],
        currentTurn: 0,
        createdAt: new Date()
      },
      playerSockets: new Map([[playerId, socket.id]]),
      observers: [],
      observerSockets: new Map()
    };

    gameRooms.set(gameId, gameRoom);
    socket.join(gameId);

    console.log(`[GAME CREATED] Game ${gameId} by ${playerName}`);
    console.log(`[SERVER] Sending create-game callback with gameId=${gameId}, playerId=${playerId}`);
    callback(gameId, playerId);
  };
}

export function handleJoinGame(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (
    gameId: string,
    playerName: string,
    callback: (success: boolean, playerId?: string, error?: string) => void
  ) => {
    const gameRoom = gameRooms.get(gameId);

    if (!gameRoom) {
      callback(false, undefined, 'Game not found');
      return;
    }

    if (gameRoom.gameState.players[1]) {
      callback(false, undefined, 'Game is full');
      return;
    }

    const playerId = socket.id;
    const player2: Player = {
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

    console.log(`[SERVER] Emitting game-update to room ${gameId} with phase: placement`);
    io.to(gameId).emit('game-update', {
      phase: 'placement'
    });

    const player1Socket = gameRoom.playerSockets.get(gameRoom.gameState.players[0].id);
    const player1Name = gameRoom.gameState.players[0].name;

    if (player1Socket) {
      console.log(`[SERVER] Emitting opponent-joined to player 1 (socket: ${player1Socket})`);
      io.to(player1Socket).emit('opponent-joined', playerName);
    } else {
      console.log(`[ERROR] Could not find player 1 socket`);
    }

    console.log(`[SERVER] Emitting opponent-joined to player 2 (socket: ${socket.id})`);
    io.to(socket.id).emit('opponent-joined', player1Name);

    console.log(`[PLAYER JOINED] ${playerName} joined game ${gameId}`);
    console.log(`[SERVER] Sending join-game callback with success=true, playerId=${playerId}`);
    callback(true, playerId);
  };
}
