import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from './server/manager.js';

function socketDevPlugin(): Plugin {
	return {
		name: 'socket-io-dev',
		configureServer(server) {
			if (!server.httpServer) return;
			const io = new SocketIOServer(server.httpServer, {
				maxHttpBufferSize: 16 * 1024,
				serveClient: false
			});
			const manager = new RoomManager();
			manager.attach(io);
			console.log('[DEV] Embedded Socket.IO server running on Vite dev server');
		}
	};
}

export default defineConfig({
	plugins: [sveltekit(), socketDevPlugin()],
	server: {
		host: '0.0.0.0',
		port: 50955,
		strictPort: false,
		fs: {
			allow: ['..']
		},
		hmr: {
			clientPort: 50955
		}
	},
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node'
	},
	preview: {
		host: '0.0.0.0',
		port: 50955,
		strictPort: false
	}
});
