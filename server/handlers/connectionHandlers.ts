import { Socket, Server as SocketIOServer } from 'socket.io';
import { GameRoom } from '../types.js';

export function handleDisconnect(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return () => {
    console.log(`[DISCONNECT] Client disconnected: ${socket.id}`);
    for (const [gameId, gameRoom] of gameRooms.entries()) {
      for (const [playerId, socketId] of gameRoom.playerSockets.entries()) {
        if (socketId === socket.id) {
          io.to(gameId).emit('player-disconnected', playerId);
          gameRooms.delete(gameId);
          break;
        }
      }

      for (const [observerId, socketId] of gameRoom.observerSockets.entries()) {
        if (socketId === socket.id) {
          console.log(`[DISCONNECT] Observer disconnected from game ${gameId}`);
          gameRoom.observers = gameRoom.observers.filter(obs => obs.id !== observerId);
          gameRoom.observerSockets.delete(observerId);
          break;
        }
      }
    }
  };
}
