# 🎮 BattleChip - Network Warfare Simulator

A 1v1 online multiplayer tactical "Battleship" clone with a hacking theme and resource dependency mechanics.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 Overview

BattleChip is a turn-based strategy game where players manage a hidden grid representing their corporate network. Place "resources" (similar to ships in Battleship) that your opponent must find and destroy. The twist? A **Hack Chain** system where destroying certain resources grants special abilities and bonuses.

## ✨ Features

### Core Gameplay
- **10x10 Grid System**: Deploy and attack on a classic tactical grid
- **6 Unique Resources**: Database, Backup, Server, Firewall, IoT Cluster, Router
- **Real-time Multiplayer**: Socket.io-powered instant updates
- **Turn-based Combat**: Strategic gameplay with immediate feedback

### 🔗 Hack Chain System (Resource Dependencies)

#### 1. **Firewall Breach → Ping Sweep**
- Destroy the enemy's Firewall
- **Unlock**: One-time "Ping Sweep" ability
- **Effect**: Reveal a 3x3 grid area (hit/miss/empty status)

#### 2. **Server → Database Chain**
- Destroy the Server first
- **Gain**: "Admin Access" status (permanent)
- **Effect**: All Database hits worth 2x points (20 instead of 10)
- **Bonus**: Database destruction worth 1000 points instead of 500 (2x multiplier)

#### 3. **IoT Cluster → DDoS Attack**
- Destroy the IoT Cluster
- **Trigger**: "DDoS Attack" on opponent
- **Effect**: Opponent's attack grid scrambled for one turn

### 📊 Resources

| Resource | Size | Base Points | Description |
|----------|------|-------------|-------------|
| 🗄️ Database | 5 | 500 | The crown jewel - critical data |
| 💾 Backup | 4 | 300 | Offline storage - high value target |
| 🖥️ Server | 4 | 250 | Application server - holds the logic |
| 🛡️ Firewall | 3 | 150 | Network's main defense |
| 📱 IoT Cluster | 3 | 100 | Smart devices - often a weak point |
| 📡 Router | 2 | 50 | Entry point for network traffic |

### 🎨 Visual Theme

**Retro-Futuristic Hacker Console**
- Green-on-black terminal aesthetic (inspired by Mr. Robot/WarGames)
- Matrix-style scanlines and glowing effects
- ASCII art and terminal-style messages
- Animated feedback for hits, misses, and destructions

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm or yarn

### Installation

```bash
# Navigate to the project directory
cd battlechip

# Install dependencies
npm install

# Build the production version
npm run build

# Start the server
npm start
```

The game will be available at `http://localhost:51977`

### Development Mode

```bash
npm run dev
```

## 🎮 How to Play

### 1. **Lobby Phase**
- Enter your username
- Choose to:
  - **Create New Network**: Start a new game and share the Game ID
  - **Infiltrate Network**: Join an existing game with a Game ID

### 2. **Deployment Phase**
- Place all 6 resources on your 10x10 grid
- Click a resource to select it
- Click on the grid to place
- Use `[ROTATE]` to switch between horizontal/vertical
- Click `[SYSTEMS ONLINE]` when ready

### 3. **Battle Phase**
- **Your Turn**: Click on the enemy's grid to attack
- **Feedback**:
  - `[MISS]` - Empty cell (0 points)
  - `[BREACH]` - Hit a resource (+10 points)
  - `[RESOURCE OFFLINE]` - Destroyed a resource (+ base points)
- Watch for Hack Chain notifications
- Use special abilities when unlocked

### 4. **Game Over**
- Game ends when all resources of one player are destroyed
- Winner determined by highest score
- Option to disconnect and start a new game

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: SvelteKit 5 + TypeScript
- **Backend**: Node.js + Express
- **Real-time**: Socket.io (WebSockets)
- **Styling**: Component-scoped CSS

### Project Structure

```
battlechip/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Grid.svelte           # Reusable grid display
│   │   │   └── ResourcePlacement.svelte  # Placement UI
│   │   ├── server/
│   │   │   ├── game-engine.ts        # Core game logic
│   │   │   └── socket-server.ts      # WebSocket handlers
│   │   ├── stores/
│   │   │   └── game.ts               # Svelte store for state
│   │   ├── types/
│   │   │   └── game.ts               # TypeScript definitions
│   │   └── utils/
│   │       └── grid.ts               # Grid utilities
│   └── routes/
│       └── +page.svelte              # Main game page
├── server.js                         # Production server
└── package.json
```

### Key Mechanics

#### Attack Processing
```typescript
// Hit detection with chain bonuses
if (attacker.abilities.adminAccessActive && resource.type === 'database') {
  points = HIT_POINTS * ADMIN_ACCESS_MULTIPLIER; // 20 instead of 10
}

// Destruction bonus with chain multiplier
if (resource.type === 'database' && defender.destroyedResources.has('server')) {
  destroyPoints *= DATABASE_CHAIN_BONUS_MULTIPLIER; // 1000 instead of 500
}
```

#### Ping Sweep Ability
```typescript
// Reveals 3x3 area around target coordinate
const adjacentCoords = getAdjacentCoordinates(coordinate);
// Returns status for all 9 cells (including center)
```

## 🎯 Game Strategy Tips

1. **Protect Your Database**: It's worth the most points
2. **Target the Firewall**: Unlock Ping Sweep early for reconnaissance
3. **Server-Database Chain**: Destroying the server before the database doubles your points
4. **IoT First**: Take out their IoT Cluster to disrupt their next turn
5. **Corner Placement**: Edges and corners are harder to find

## 🔧 Configuration

Edit `vite.config.ts` to change the port:

```typescript
server: {
  port: 51977, // Change this
  host: '0.0.0.0'
}
```

## 📝 Scoring System

| Action | Points |
|--------|--------|
| Hit | 10 |
| Hit (Admin Access + Database) | 20 |
| Destroy Router | 50 |
| Destroy IoT Cluster | 100 |
| Destroy Firewall | 150 |
| Destroy Server | 250 |
| Destroy Backup | 300 |
| Destroy Database (normal) | 500 |
| Destroy Database (after Server) | 1000 |

## 🐛 Known Issues

- DDoS effect (grid scrambling) is implemented on the server but not yet reflected in the UI
- No sound effects yet (keyboard clicks, sirens, etc.)
- Ping Sweep UI visualization could be improved

## 🚀 Future Enhancements

- [ ] Add sound effects (keyboard typing, connection chimes, warning sirens)
- [ ] Implement DDoS visual effect (scrambled grid display)
- [ ] Add chat functionality
- [ ] Player statistics and leaderboards
- [ ] Replay system
- [ ] Mobile-responsive design
- [ ] AI opponent for single-player mode
- [ ] Custom resource skins/themes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by the classic Battleship game
- Visual aesthetic inspired by Mr. Robot and WarGames
- Built with SvelteKit and Socket.io

---

**[SYSTEM READY]** - **[DEPLOY YOUR NETWORK]** - **[COMMENCE WARFARE]**
