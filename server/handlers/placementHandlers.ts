import { Socket, Server as SocketIOServer } from 'socket.io';
import { GameRoom, ResourcePlacement } from '../types.js';
import { placeResource, allResourcesPlaced } from '../utils/grid.js';
import { RESOURCES } from '../constants.js';

export function handlePlaceResources(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (gameId: string, playerId: string, resourcePlacements: ResourcePlacement[]) => {
    const gameRoom = gameRooms.get(gameId);
    if (!gameRoom) {
      console.log(`[ERROR] Game room not found for place-resources: ${gameId}`);
      return;
    }

    const player = gameRoom.gameState.players.find(p => p?.id === playerId);
    if (!player) {
      console.log(`[ERROR] Player not found for place-resources: ${playerId}`);
      return;
    }

    console.log(`[RESOURCES PLACING] Player ${player.name} placing ${resourcePlacements.length} resources`);
    for (const placement of resourcePlacements) {
      const success = placeResource(player.grid, placement.type, placement.start, placement.orientation);
      if (!success) {
        console.log(`[ERROR] Failed to place resource ${placement.type} for ${player.name}`);
      }
    }

    console.log(`[RESOURCES PLACED] Player ${player.name} placed resources. Total: ${player.grid.resources.length}/${Object.keys(RESOURCES).length}`);
  };
}

export function handlePlayerReady(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (gameId: string, playerId: string) => {
    const gameRoom = gameRooms.get(gameId);
    if (!gameRoom) {
      console.log(`[ERROR] Game room not found: ${gameId}`);
      return;
    }

    const player = gameRoom.gameState.players.find(p => p?.id === playerId);
    if (!player) {
      console.log(`[ERROR] Player not found: ${playerId}`);
      return;
    }

    const resourceCount = player.grid.resources.length;
    const requiredCount = Object.keys(RESOURCES).length;
    if (!allResourcesPlaced(player.grid)) {
      socket.emit('error', 'All resources must be placed');
      console.log(`[ERROR] Player ${player.name} tried to ready without all resources placed (${resourceCount}/${requiredCount})`);
      return;
    }

    player.isReady = true;
    console.log(`[PLAYER READY] ${player.name} is ready (${resourceCount}/${requiredCount} resources)`);

    const otherPlayerIndex = gameRoom.gameState.players[0].id === playerId ? 1 : 0;
    const otherPlayer = gameRoom.gameState.players[otherPlayerIndex];

    if (otherPlayer) {
      const otherPlayerSocket = gameRoom.playerSockets.get(otherPlayer.id);
      if (otherPlayerSocket) {
        io.to(otherPlayerSocket).emit('opponent-ready');
        console.log(`[OPPONENT READY] Notified ${otherPlayer.name} that opponent is ready`);
      }
    }

    if (gameRoom.gameState.players[0]?.isReady && gameRoom.gameState.players[1]?.isReady) {
      gameRoom.gameState.phase = 'battle';
      io.to(gameId).emit('battle-started');

      const currentPlayer = gameRoom.gameState.players[gameRoom.gameState.currentTurn];
      if (currentPlayer) {
        const currentPlayerSocket = gameRoom.playerSockets.get(currentPlayer.id);
        if (currentPlayerSocket) {
          io.to(currentPlayerSocket).emit('your-turn');
        }
      }

      console.log(`[BATTLE STARTED] Game ${gameId}`);
    } else {
      console.log(`[WAITING] Game ${gameId} - Player 0 ready: ${gameRoom.gameState.players[0]?.isReady}, Player 1 ready: ${gameRoom.gameState.players[1]?.isReady}`);
    }
  };
}
