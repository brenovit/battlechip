# Server Architecture

This directory contains the TypeScript-based backend server for BattleChip, organized into modular, maintainable components.

## Directory Structure

```
server/
├── server.ts                 # Main server entry point
├── types.ts                  # TypeScript type definitions
├── constants.ts              # Game constants and configuration
├── handlers/                 # Socket.IO event handlers
│   ├── lobbyHandlers.ts      # Create/join game handlers
│   ├── placementHandlers.ts  # Resource placement handlers
│   ├── battleHandlers.ts     # Combat and rematch handlers
│   └── connectionHandlers.ts # Connection/disconnection handlers
├── game/                     # Game logic
│   └── gameLogic.ts          # Attack processing and game state
└── utils/                    # Utility functions
    └── grid.ts               # Grid creation and resource placement
```

## Modules

### server.ts
Main entry point that:
- Sets up Express server and Socket.IO
- Manages the game rooms collection
- Registers all event handlers
- Starts the server on the configured port

### types.ts
Contains all TypeScript interfaces:
- `Coordinate`, `Cell`, `Grid` - Grid-related types
- `Player`, `Abilities` - Player data structures
- `GameState`, `GameRoom` - Game state management
- `AttackResult` - Attack response type

### constants.ts
Game configuration constants:
- `GRID_SIZE` - Size of the game grid (10x10)
- `HIT_POINTS` - Points per successful hit
- `RESOURCES` - Definitions for all resources
- Multipliers for special abilities

### handlers/
Event handlers organized by game phase:

#### lobbyHandlers.ts
- `handleCreateGame` - Creates a new game room
- `handleJoinGame` - Joins existing game room

#### placementHandlers.ts
- `handlePlaceResources` - Places resources on grid
- `handlePlayerReady` - Marks player as ready and starts battle

#### battleHandlers.ts
- `handleAttack` - Processes attack moves
- `handleRequestRematch` - Manages rematch logic

#### connectionHandlers.ts
- `handleDisconnect` - Cleans up on player disconnect

### game/gameLogic.ts
Core game logic:
- `generateGameId` - Creates unique game IDs
- `processAttack` - Handles attack logic, scoring, and abilities

### utils/grid.ts
Grid management utilities:
- `createEmptyGrid` - Initializes game grid
- `canPlaceResource` - Validates resource placement
- `placeResource` - Places resource on grid
- `allResourcesPlaced` / `allResourcesDestroyed` - State checks

## Building and Running

### Development
```bash
# Build the server (compiles TypeScript to JavaScript)
npm run build:server

# Start the server
npm start
```

### Production
```bash
# Build everything (client + server)
npm run build

# Start the production server
npm start
```

The compiled JavaScript will be output to `dist/server/`.

## Architecture Benefits

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Type Safety**: Full TypeScript support with strict typing
3. **Maintainability**: Easy to locate and modify specific functionality
4. **Testability**: Modular structure allows for easier unit testing
5. **Scalability**: Easy to add new features or handlers

## Migration Notes

The original `server.js` has been refactored into this TypeScript structure. The old file remains at the project root as a reference but should not be used. Use `npm start` which now points to the compiled TypeScript server.

To revert to the old server temporarily, use:
```bash
npm run start:old
```
