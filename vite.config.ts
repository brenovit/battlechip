import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 50955,
		strictPort: false,
		fs: {
			allow: ['..']
		},
		hmr: {
			clientPort: 50955
		},
		// Dev: forward Socket.IO to the game server (`npm run build:server && node dist/server/server.js`).
		proxy: {
			'/socket.io': { target: 'http://localhost:50680', ws: true }
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
