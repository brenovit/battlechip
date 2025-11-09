# 🎮 BattleChip - Access Information

## 🌐 Game URL

**Your game is now live and accessible at:**

### Primary URL
```
http://localhost:51977
```

### Alternative Access (if needed)
```
http://localhost:55834
```

## 🎯 Quick Test (2 Players)

### Player 1 (First Browser/Tab)
1. Open: http://localhost:51977
2. Enter username: `Hacker1`
3. Click: **[CREATE NEW NETWORK]**
4. Note the **Game ID** displayed (e.g., "A3K9F2")

### Player 2 (Second Browser/Tab)
1. Open: http://localhost:51977 (in new tab/window)
2. Enter username: `Hacker2`
3. Enter the Game ID from Player 1
4. Click: **[INFILTRATE NETWORK]**

### Play!
- Both players place resources
- Click **[SYSTEMS ONLINE]** when ready
- Take turns attacking
- First to destroy all enemy resources wins!

## 📊 Server Status

✅ **Server Running**: Port 51977
✅ **WebSocket**: Socket.io ready
✅ **Game Engine**: Loaded
✅ **Status**: Operational

Check server logs:
```bash
tail -f /workspace/battlechip/server.log
```

## 🛠️ Server Management

### Start Server
```bash
cd /workspace/battlechip
npm start
```

### Stop Server
```bash
pkill -f "node server.js"
```

### Restart Server
```bash
pkill -f "node server.js" && npm start
```

### View Logs
```bash
cat /workspace/battlechip/server.log
```

## 📚 Documentation

- **README.md** - Full project documentation
- **QUICKSTART.md** - Quick start guide
- **PROJECT_SUMMARY.md** - Complete feature list

---

**[ACCESS GRANTED]** - **[NETWORK ONLINE]** - **[READY TO PLAY]** 🎮⚡
