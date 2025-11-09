# 🚀 BattleChip Quick Start Guide

## Accessing the Game

The game is currently running at: **http://localhost:51977**

## How to Play (2 Players)

### Player 1 - Create Game
1. Open http://localhost:51977
2. Enter your username (e.g., "Hacker1")
3. Click **[CREATE NEW NETWORK]**
4. You'll see a **Game ID** (e.g., "A3K9F2")
5. Share this Game ID with Player 2

### Player 2 - Join Game
1. Open http://localhost:51977 in a different browser/tab
2. Enter your username (e.g., "Hacker2")
3. Enter the Game ID from Player 1
4. Click **[INFILTRATE NETWORK]**

### Both Players - Deploy Resources
1. Click on a resource from the list (Database, Backup, Server, etc.)
2. Click on the grid to place it
3. Use **[ROTATE]** to switch between horizontal/vertical
4. Place all 6 resources
5. Click **[SYSTEMS ONLINE]** when done
6. Wait for opponent to finish

### Battle Phase
- **Player 1 goes first** (indicated by green pulsing "YOUR TURN")
- Click on enemy grid to attack
- Watch for:
  - **[MISS]** = empty cell
  - **[BREACH]** = hit a resource (+10 points)
  - **[RESOURCE OFFLINE]** = destroyed completely (+ bonus points)
- Special abilities unlock when you destroy:
  - 🛡️ **Firewall** → Ping Sweep ability
  - 🖥️ **Server** → Admin Access (2x damage to Database)
  - 📱 **IoT Cluster** → DDoS opponent
- Game ends when all resources are destroyed
- **Highest score wins!**

## 🎮 Strategy Tips

1. **Protect your Database** (5 cells, 500+ points)
2. **Target Firewall early** for reconnaissance
3. **Server → Database combo** for massive points (1000 instead of 500)
4. **Spread out resources** to make them harder to find
5. **Use corners and edges** - harder to scan

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📊 Resource Quick Reference

| Resource | Size | Points | Special Effect |
|----------|------|--------|----------------|
| 🗄️ Database | 5 | 500 (or 1000) | 2x points if Server destroyed first |
| 💾 Backup | 4 | 300 | - |
| 🖥️ Server | 4 | 250 | Unlocks Admin Access |
| 🛡️ Firewall | 3 | 150 | Unlocks Ping Sweep |
| 📱 IoT Cluster | 3 | 100 | Triggers DDoS |
| 📡 Router | 2 | 50 | - |

## 🐛 Troubleshooting

**Can't connect to game?**
- Make sure server is running on port 51977
- Check browser console for errors
- Try refreshing the page

**Game ID not working?**
- Game IDs are case-sensitive and 6 characters
- Make sure Player 1 created the game first
- Try creating a new game

**Grid not displaying?**
- Clear browser cache and reload
- Check if JavaScript is enabled
- Try a different browser

## 🎨 Theme

The game uses a retro-futuristic "hacker terminal" aesthetic:
- **Green text on black** (Matrix/terminal style)
- **Glowing effects** and scanlines
- **Terminal commands** as buttons
- **ASCII art** for destroyed resources

---

**[READY TO PLAY?]** Open http://localhost:51977 and start hacking! 💻⚡
