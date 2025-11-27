import { createServer } from 'http';
import express, { RequestHandler } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './types.js';
import {
  handleCreateGame,
  handleJoinGame
} from './handlers/lobbyHandlers.js';
import {
  handlePlaceResources,
  handlePlayerReady
} from './handlers/placementHandlers.js';
import {
  handleAttack,
  handleRequestRematch
} from './handlers/battleHandlers.js';
import { handleDisconnect } from './handlers/connectionHandlers.js';
import { handleJoinAsObserver } from './handlers/observerHandlers.js';

const app = express();
const server = createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const gameRooms = new Map<string, GameRoom>();

io.on('connection', (socket) => {
  console.log(`[CONNECTION] Client connected: ${socket.id}`);

  socket.on('create-game', handleCreateGame(socket, io, gameRooms));
  socket.on('join-game', handleJoinGame(socket, io, gameRooms));
  socket.on('join-as-observer', handleJoinAsObserver(socket, io, gameRooms));
  socket.on('place-resources', handlePlaceResources(socket, io, gameRooms));
  socket.on('player-ready', handlePlayerReady(socket, io, gameRooms));
  socket.on('attack', handleAttack(socket, io, gameRooms));
  socket.on('request-rematch', handleRequestRematch(socket, io, gameRooms));
  socket.on('disconnect', handleDisconnect(socket, io, gameRooms));
});

// Serve SvelteKit app (dynamically imported to avoid TypeScript issues)
const loadHandler = async () => {
  // @ts-ignore - SvelteKit build output doesn't have type definitions
  const { handler } = await import('../../build/handler.js');
  app.use(handler as RequestHandler);
};
loadHandler().catch(console.error);

const PORT = parseInt(process.env.PORT || '50680', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] BattleChip running on http://localhost:${PORT}`);
});
