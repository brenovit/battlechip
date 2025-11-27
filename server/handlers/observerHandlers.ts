import { Socket, Server as SocketIOServer } from 'socket.io';
import { GameRoom, Observer } from '../types.js';

export function handleJoinAsObserver(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (
    gameId: string,
    observerName: string,
    callback: (success: boolean, observerId?: string, error?: string) => void
  ) => {
    const gameRoom = gameRooms.get(gameId);

    if (!gameRoom) {
      callback(false, undefined, 'Game not found');
      return;
    }

    const observerId = socket.id;
    const observer: Observer = {
      id: observerId,
      name: observerName
    };

    gameRoom.observers.push(observer);
    gameRoom.observerSockets.set(observerId, socket.id);
    socket.join(gameId);

    console.log(`[OBSERVER JOINED] ${observerName} joined game ${gameId} as observer`);

    const player1 = gameRoom.gameState.players[0];
    const player2 = gameRoom.gameState.players[1];

    const observerGameState = {
      phase: gameRoom.gameState.phase,
      currentTurn: gameRoom.gameState.currentTurn,
      player1: player1 ? {
        name: player1.name,
        score: player1.score,
        grid: player1.grid,
        isReady: player1.isReady
      } : null,
      player2: player2 ? {
        name: player2.name,
        score: player2.score,
        grid: player2.grid,
        isReady: player2.isReady
      } : null
    };

    socket.emit('observer-state', observerGameState);

    callback(true, observerId);
  };
}
