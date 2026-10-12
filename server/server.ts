import { createServer, type IncomingMessage } from 'http';
import express, { type RequestHandler } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { CONFIG } from './config.js';
import { RoomManager } from './manager.js';

const app = express();
app.disable('x-powered-by');
const server = createServer(app);

/** Origin check: explicit allow-list (ALLOWED_ORIGINS) or same-origin; localhost allowed outside production. */
export function originAllowed(req: IncomingMessage): boolean {
	const origin = req.headers.origin;
	if (!origin) return process.env.NODE_ENV !== 'production';
	if (CONFIG.allowedOrigins.length > 0) return CONFIG.allowedOrigins.includes(origin);
	try {
		const u = new URL(origin);
		if (u.host === req.headers.host) return true;
		return process.env.NODE_ENV !== 'production' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
	} catch {
		return false;
	}
}

const io = new SocketIOServer(server, {
	maxHttpBufferSize: CONFIG.maxMessageBytes,
	allowRequest: (req, cb) => cb(null, originAllowed(req)),
	serveClient: false
});

const manager = new RoomManager();
manager.attach(io);

// Serve the SvelteKit app (adapter-node build output).
const loadHandler = async () => {
	// @ts-ignore - SvelteKit build output doesn't have type definitions
	const { handler } = await import('../../build/handler.js');
	app.use(handler as RequestHandler);
};
loadHandler().catch((e) => console.error('[SERVER] Could not load SvelteKit handler (run `vite build`):', e.message));

server.listen(CONFIG.port, '0.0.0.0', () => {
	console.log(`[SERVER] BattleChip running on http://localhost:${CONFIG.port}`);
});

const shutdown = () => {
	manager.dispose();
	io.close();
	server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
