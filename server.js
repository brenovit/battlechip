import { createServer } from 'http';
import { handler } from './build/handler.js';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = createServer(app);

const io = new SocketIOServer(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST']
	}
});

const gameRooms = new Map();
const GRID_SIZE = 10;
const HIT_POINTS = 10;
const ADMIN_ACCESS_MULTIPLIER = 2;
const DATABASE_CHAIN_BONUS_MULTIPLIER = 2;

const RESOURCES = {
	'database': { type: 'database', name: 'Database', size: 5, basePoints: 500 },
	'backup': { type: 'backup', name: 'Backup', size: 4, basePoints: 300 },
	'server': { type: 'server', name: 'Server', size: 4, basePoints: 250 },
	'firewall': { type: 'firewall', name: 'Firewall', size: 3, basePoints: 150 },
	'iot-cluster': { type: 'iot-cluster', name: 'IoT Cluster', size: 3, basePoints: 100 },
	'router': { type: 'router', name: 'Router', size: 2, basePoints: 50 }
};

function generateGameId() {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createEmptyGrid() {
	const cells = [];
	for (let row = 0; row < GRID_SIZE; row++) {
		cells[row] = [];
		for (let col = 0; col < GRID_SIZE; col++) {
			cells[row][col] = {
				coordinate: { row, col },
				status: 'empty'
			};
		}
	}
	return { cells, resources: [] };
}

function coordinateToString(coord) {
	return `${coord.row},${coord.col}`;
}

function canPlaceResource(grid, start, size, orientation) {
	for (let i = 0; i < size; i++) {
		const coord = orientation === 'horizontal'
			? { row: start.row, col: start.col + i }
			: { row: start.row + i, col: start.col };
		
		if (coord.row < 0 || coord.row >= GRID_SIZE || coord.col < 0 || coord.col >= GRID_SIZE) {
			return false;
		}
		
		if (grid.cells[coord.row][coord.col].resourceType) {
			return false;
		}
	}
	return true;
}

function placeResource(grid, type, start, orientation) {
	const resource = RESOURCES[type];
	if (!canPlaceResource(grid, start, resource.size, orientation)) {
		return false;
	}

	const coordinates = [];
	for (let i = 0; i < resource.size; i++) {
		const coord = orientation === 'horizontal'
			? { row: start.row, col: start.col + i }
			: { row: start.row + i, col: start.col };
		coordinates.push(coord);
		grid.cells[coord.row][coord.col].resourceType = type;
	}

	grid.resources.push({
		type,
		coordinates,
		hits: new Set(),
		isDestroyed: false
	});
	return true;
}

function allResourcesPlaced(grid) {
	return grid.resources.length === Object.keys(RESOURCES).length;
}

function allResourcesDestroyed(grid) {
	return grid.resources.every(r => r.isDestroyed);
}

function processAttack(gameState, attackerIndex, coordinate) {
	const defenderIndex = attackerIndex === 0 ? 1 : 0;
	const attacker = gameState.players[attackerIndex];
	const defender = gameState.players[defenderIndex];

	const cell = defender.grid.cells[coordinate.row][coordinate.col];
	const coordStr = coordinateToString(coordinate);

	if (cell.status !== 'empty') {
		return {
			coordinate,
			status: 'miss',
			points: 0,
			message: '[ALREADY TARGETED]'
		};
	}

	if (!cell.resourceType) {
		cell.status = 'miss';
		return {
			coordinate,
			status: 'miss',
			points: 0,
			message: '[MISS] - [TIMEOUT]'
		};
	}

	const resource = defender.grid.resources.find(r => r.type === cell.resourceType);
	if (!resource) {
		return {
			coordinate,
			status: 'miss',
			points: 0,
			message: '[ERROR] - Resource not found'
		};
	}

	resource.hits.add(coordStr);
	cell.status = 'hit';

	let points = HIT_POINTS;
	if (attacker.abilities.adminAccessActive && resource.type === 'database') {
		points = HIT_POINTS * ADMIN_ACCESS_MULTIPLIER;
	}

	attacker.score += points;

	if (resource.hits.size === resource.coordinates.length) {
		resource.isDestroyed = true;
		defender.destroyedResources.add(resource.type);

		for (const coord of resource.coordinates) {
			defender.grid.cells[coord.row][coord.col].status = 'destroyed';
		}

		let destroyPoints = RESOURCES[resource.type].basePoints;

		if (resource.type === 'database' && defender.destroyedResources.has('server')) {
			destroyPoints *= DATABASE_CHAIN_BONUS_MULTIPLIER;
		}

		attacker.score += destroyPoints;

		if (resource.type === 'firewall') {
			attacker.abilities.pingSweepAvailable = true;
		} else if (resource.type === 'server') {
			attacker.abilities.adminAccessActive = true;
		} else if (resource.type === 'iot-cluster') {
			defender.abilities.ddosEffectActive = true;
		}

		if (allResourcesDestroyed(defender.grid)) {
			gameState.phase = 'game-over';
			gameState.winner = attackerIndex;
		}

		return {
			coordinate,
			status: 'destroyed',
			resourceType: resource.type,
			points: points + destroyPoints,
			message: `[${RESOURCES[resource.type].name.toUpperCase()} OFFLINE] - [SYSTEM COMPROMISED]`
		};
	}

	return {
		coordinate,
		status: 'hit',
		resourceType: resource.type,
		points,
		message: `[BREACH] - [ACCESS GRANTED]`
	};
}

io.on('connection', (socket) => {
	console.log(`[CONNECTION] Client connected: ${socket.id}`);

	socket.on('create-game', (playerName, callback) => {
		const gameId = generateGameId();
		const playerId = socket.id;

		const player1 = {
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

		const gameState = {
			id: gameId,
			phase: 'lobby',
			players: [player1, null],
			currentTurn: 0,
			createdAt: new Date()
		};

		const gameRoom = {
			gameState,
			playerSockets: new Map([[playerId, socket.id]])
		};

		gameRooms.set(gameId, gameRoom);
		socket.join(gameId);

		console.log(`[GAME CREATED] Game ${gameId} by ${playerName}`);
		callback(gameId, playerId);
	});

	socket.on('join-game', (gameId, playerName, callback) => {
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
		const player2 = {
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

		io.to(gameId).emit('game-update', {
			phase: 'placement'
		});

		const player1Socket = gameRoom.playerSockets.get(gameRoom.gameState.players[0].id);
		if (player1Socket) {
			io.to(player1Socket).emit('opponent-joined', playerName);
		}

		console.log(`[PLAYER JOINED] ${playerName} joined game ${gameId}`);
		callback(true, playerId);
	});

	socket.on('place-resources', (gameId, playerId, resourcePlacements) => {
		const gameRoom = gameRooms.get(gameId);
		if (!gameRoom) return;

		const player = gameRoom.gameState.players.find(p => p?.id === playerId);
		if (!player) return;

		for (const placement of resourcePlacements) {
			placeResource(player.grid, placement.type, placement.start, placement.orientation);
		}

		console.log(`[RESOURCES PLACED] Player ${player.name} placed resources`);
	});

	socket.on('player-ready', (gameId, playerId) => {
		const gameRoom = gameRooms.get(gameId);
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
			io.to(otherPlayerSocket).emit('opponent-ready');
		}

		if (gameRoom.gameState.players[0].isReady && gameRoom.gameState.players[1].isReady) {
			gameRoom.gameState.phase = 'battle';
			io.to(gameId).emit('battle-started');

			const currentPlayerSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[gameRoom.gameState.currentTurn].id);
			if (currentPlayerSocket) {
				io.to(currentPlayerSocket).emit('your-turn');
			}

			console.log(`[BATTLE STARTED] Game ${gameId}`);
		}
	});

	socket.on('attack', (gameId, playerId, coordinate, callback) => {
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
		const defenderSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[defenderIndex].id);
		if (defenderSocket) {
			io.to(defenderSocket).emit('opponent-attacked', coordinate, result.status !== 'miss');
		}

		if (gameRoom.gameState.phase === 'game-over') {
			const finalScores = [
				gameRoom.gameState.players[0].score,
				gameRoom.gameState.players[1].score
			];
			const winner = finalScores[0] > finalScores[1] ? 0 : 1;
			gameRoom.gameState.winner = winner;

			io.to(gameId).emit('game-over', winner, finalScores);
			console.log(`[GAME OVER] Game ${gameId} - Winner: Player ${winner + 1}`);
		} else {
			gameRoom.gameState.currentTurn = gameRoom.gameState.currentTurn === 0 ? 1 : 0;
			const nextPlayerSocket = gameRoom.playerSockets.get(gameRoom.gameState.players[gameRoom.gameState.currentTurn].id);
			if (nextPlayerSocket) {
				io.to(nextPlayerSocket).emit('your-turn');
			}
		}
	});

	socket.on('disconnect', () => {
		console.log(`[DISCONNECT] Client disconnected: ${socket.id}`);
		for (const [gameId, gameRoom] of gameRooms.entries()) {
			for (const [playerId, socketId] of gameRoom.playerSockets.entries()) {
				if (socketId === socket.id) {
					io.to(gameId).emit('player-disconnected', playerId);
					gameRooms.delete(gameId);
					break;
				}
			}
		}
	});
});

app.use(handler);

const PORT = 51977;
server.listen(PORT, '0.0.0.0', () => {
	console.log(`[SERVER] BattleChip running on http://localhost:${PORT}`);
});
