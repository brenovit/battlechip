import { Socket, Server as SocketIOServer } from 'socket.io';
import { GameRoom, Coordinate, AttackResult } from '../types.js';
import { processAttack } from '../game/gameLogic.js';
import { createEmptyGrid } from '../utils/grid.js';

export function handleAttack(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (
    gameId: string,
    playerId: string,
    coordinate: Coordinate,
    callback: (result: AttackResult) => void
  ) => {
    const gameRoom = gameRooms.get(gameId);
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

    const result = processAttack(gameRoom.gameState, attackerIndex, coordinate);
    callback(result);

    const defenderIndex = attackerIndex === 0 ? 1 : 0;
    const defender = gameRoom.gameState.players[defenderIndex];
    if (defender) {
      const defenderSocket = gameRoom.playerSockets.get(defender.id);
      if (defenderSocket) {
        io.to(defenderSocket).emit('opponent-attacked', coordinate, result.status !== 'miss');
      }
    }

    for (const observer of gameRoom.observers) {
      const observerSocket = gameRoom.observerSockets.get(observer.id);
      if (observerSocket) {
        io.to(observerSocket).emit('observer-attack-update', {
          attackerIndex,
          coordinate,
          result,
          player1Grid: gameRoom.gameState.players[0].grid,
          player2Grid: gameRoom.gameState.players[1]?.grid,
          player1Score: gameRoom.gameState.players[0].score,
          player2Score: gameRoom.gameState.players[1]?.score || 0,
          currentTurn: gameRoom.gameState.currentTurn
        });
      }
    }

    if (gameRoom.gameState.phase === 'game-over') {
      const finalScores = [
        gameRoom.gameState.players[0].score,
        gameRoom.gameState.players[1]?.score || 0
      ];
      const winner = finalScores[0] > finalScores[1] ? 0 : 1;
      gameRoom.gameState.winner = winner;

      io.to(gameId).emit('game-over', winner, finalScores);
      console.log(`[GAME OVER] Game ${gameId} - Winner: Player ${winner + 1}`);
    } else {
      gameRoom.gameState.currentTurn = gameRoom.gameState.currentTurn === 0 ? 1 : 0;
      const nextPlayer = gameRoom.gameState.players[gameRoom.gameState.currentTurn];
      if (nextPlayer) {
        const nextPlayerSocket = gameRoom.playerSockets.get(nextPlayer.id);
        if (nextPlayerSocket) {
          io.to(nextPlayerSocket).emit('your-turn');
        }
      }
    }
  };
}

export function handleRequestRematch(
  socket: Socket,
  io: SocketIOServer,
  gameRooms: Map<string, GameRoom>
) {
  return (gameId: string, playerId: string) => {
    const gameRoom = gameRooms.get(gameId);
    if (!gameRoom) return;

    if (!gameRoom.rematchRequests) {
      gameRoom.rematchRequests = new Set();
    }

    gameRoom.rematchRequests.add(playerId);
    console.log(`[REMATCH] Player ${playerId} requested rematch in game ${gameId}`);

    const otherPlayerIndex = gameRoom.gameState.players[0].id === playerId ? 1 : 0;
    const otherPlayer = gameRoom.gameState.players[otherPlayerIndex];
    if (otherPlayer) {
      const otherPlayerSocket = gameRoom.playerSockets.get(otherPlayer.id);
      if (otherPlayerSocket) {
        io.to(otherPlayerSocket).emit('opponent-wants-rematch');
      }
    }

    if (gameRoom.rematchRequests.size === 2) {
      console.log(`[REMATCH] Both players accepted - restarting game ${gameId}`);

      gameRoom.gameState.phase = 'placement';
      gameRoom.gameState.currentTurn = 0;
      gameRoom.gameState.winner = undefined;
      gameRoom.rematchRequests.clear();

      for (let player of gameRoom.gameState.players) {
        if (player) {
          player.grid = createEmptyGrid();
          player.score = 0;
          player.abilities = {
            pingSweepAvailable: false,
            adminAccessActive: false,
            ddosEffectActive: false
          };
          player.destroyedResources = new Set();
          player.isReady = false;
        }
      }

      io.to(gameId).emit('rematch-accepted');
    }
  };
}
