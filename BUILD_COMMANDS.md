# 🛠️ Build Commands Reference

## Quick Start
```bash
# Install dependencies
npm install

# Build everything (frontend + server)
npm run build

# Start the server
npm start
```

## Development
```bash
# Run in dev mode with hot reload
npm run dev
```

## Build Separately
```bash
# Build SvelteKit frontend only
vite build

# Build TypeScript server only
npm run build:server
```

## Clean Build
```bash
# Remove compiled files
rm -rf dist/ build/

# Rebuild from scratch
npm run build
```

## Verify Build
```bash
# Check compiled server files
ls -la dist/server/

# Check built SvelteKit app
ls -la build/
```

## Server Management
```bash
# Start server with custom port
PORT=3000 npm start

# Check if server is running
ps aux | grep "node dist/server/server.js"

# Stop the server
pkill -f "node dist/server/server.js"
```

## TypeScript
```bash
# Compile server with type checking
npm run build:server

# Check for TypeScript errors
cd server && tsc --noEmit
```

## Current Configuration
- **Server Port**: 52391 (or PORT env variable)
- **Server Host**: 0.0.0.0 (accepts all connections)
- **Output Directory**: `dist/server/`
- **Build Directory**: `build/`

## File Watchers
The project uses:
- `vite` for frontend hot module replacement
- Manual rebuild required for server changes in production

## Troubleshooting
```bash
# If build fails, try:
rm -rf node_modules package-lock.json
npm install
npm run build

# If port is in use:
lsof -ti:52391 | xargs kill -9
PORT=3000 npm start

# Check server logs:
tail -f server.log
```
