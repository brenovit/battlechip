# 🎮 BattleChip - Quick Start Guide

## 🚀 Server Access

**URL**: http://localhost:54440

## 🎯 How to Play

### 1️⃣ Lobby Phase
- Enter your username
- **Create New Network**: Start a game and get a Game ID
- **Infiltrate Network**: Join with a friend's Game ID
- Share the Game ID with your opponent

### 2️⃣ Deployment Phase

#### Part A: Place Resources
1. Click a resource from the list (Database, Backup, Server, etc.)
2. Click on the grid to place it
3. Use **[ROTATE]** to switch between horizontal/vertical
4. Repeat until all 6 resources are placed

#### Part B: Deploy Resources ✨
1. Click **[DEPLOY RESOURCES]** button
2. Resources are sent to the server

#### Part C: Confirm Ready ✨ **NEW!**
1. Review your placement
2. Click **[CONFIRM READY] - [START BATTLE]**
3. Wait for opponent to also confirm ready
4. Watch the status indicators:
   - `[YOU: ⧗ DEPLOYING]` → `[YOU: ✓ READY]`
   - `[OPPONENT: ⧗ DEPLOYING]` → `[OPPONENT: ✓ READY]`

### 3️⃣ Battle Phase
- Battle starts automatically when **both players are ready**
- Take turns attacking the enemy grid
- Click cells on the **[ATTACK GRID]** to attack
- Track hits and misses
- Destroy all enemy resources to win!

## 🔑 Key Features

### Ready Confirmation System (NEW!)
✅ Two-step deployment process
✅ Visual status indicators for both players
✅ Clear messages at each step
✅ Large, animated ready button
✅ No more stuck games!

### Game Mechanics
- **10x10 Grid**: Classic battleship-style gameplay
- **6 Resources**: Database (5), Backup (4), Server (4), Firewall (3), IoT Cluster (3), Router (2)
- **Hack Chain System**: Special abilities when destroying certain resources
- **Real-time Multiplayer**: Instant updates via Socket.io

## 🎨 Visual Indicators

### During Deployment:
```
[DEPLOYMENT PHASE]

[YOU: ⧗ DEPLOYING]    [OPPONENT: ⧗ DEPLOYING]
       ↓ After you click [CONFIRM READY]
[YOU: ✓ READY]        [OPPONENT: ⧗ DEPLOYING]
       ↓ After opponent clicks ready
[YOU: ✓ READY]        [OPPONENT: ✓ READY]
       ↓
[BOTH PLAYERS READY] - [INITIATING BATTLE...]
```

### Messages:
1. `[RESOURCES DEPLOYED] - [CONFIRM WHEN READY]`
2. `[YOU ARE READY] - [WAITING FOR OPPONENT...]`
3. `[OPPONENT READY] - [WAITING FOR BATTLE TO START...]`
4. `[BOTH PLAYERS READY] - [INITIATING BATTLE...]`

## 💡 Pro Tips

1. **Strategic Placement**: Put important resources in corners
2. **Don't Rush**: Take time to review placement before confirming ready
3. **Watch Status**: Keep an eye on opponent's ready status
4. **Hack Chains**: Destroy Firewall first to unlock Ping Sweep ability
5. **Server First**: Destroy Server before Database for 2x points

## 🐛 Troubleshooting

**Game stuck after placing resources?**
→ Click the **[DEPLOY RESOURCES]** button first, then **[CONFIRM READY]**

**Can't start battle?**
→ Both players must click **[CONFIRM READY]**. Check the status indicators.

**Want to change placement?**
→ Refresh the page before clicking deploy (resources lock after deploy)

**Opponent not ready?**
→ They need to place all resources, deploy, and confirm ready

## 📁 Documentation

- `README.md` - Full game documentation
- `CHANGES_SUMMARY.md` - Recent bug fix details
- `DEPLOYMENT_FIX.md` - Technical implementation
- `READY_BUTTON_GUIDE.md` - Detailed ready feature guide

## 🎮 Game Flow Summary

```
┌─────────────────────────────────────────────┐
│  1. LOBBY                                   │
│     Enter name, Create/Join game            │
├─────────────────────────────────────────────┤
│  2. DEPLOYMENT                              │
│     A. Place 6 resources on grid            │
│     B. Click [DEPLOY RESOURCES]             │
│     C. Click [CONFIRM READY] ← NEW!         │
│     D. Wait for opponent to confirm         │
├─────────────────────────────────────────────┤
│  3. BATTLE                                  │
│     Auto-starts when both ready             │
│     Take turns attacking                    │
│     First to destroy all wins!              │
├─────────────────────────────────────────────┤
│  4. GAME OVER                               │
│     View final scores                       │
│     Disconnect to play again                │
└─────────────────────────────────────────────┘
```

---

**[SYSTEM READY]** - **[DEPLOY YOUR NETWORK]** - **[COMMENCE WARFARE]**

🎮 **Have fun playing BattleChip!** 🎮
